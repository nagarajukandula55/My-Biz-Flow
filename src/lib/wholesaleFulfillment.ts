import { prisma } from "@/lib/prisma";
import { withRecordLock } from "@/lib/withRecordLock";
import { adjustReservedQty, adjustStockQty, findStockRecord, parseSerialNumbers, validateSerialNumbers } from "@/lib/inventoryStock";
import { consumeFifo, consumeSerializedUnits, createStockLots } from "@/lib/stockLots";
import { createBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import { discountedUnitPrice } from "@/lib/wholesaleData";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";

type Actor = { type: "Distributor" | "Dealer" | "System"; id?: string; note?: string };
type AllocationInput = { lineId: string; quantity: number };
type PickingInput = { lineId: string; quantity: number; serialNumbersRaw?: string };

async function assertWholesaleWrite(partnerId: string): Promise<void> {
  await assertModuleAccess(partnerId, "wholesale-b2b");
  await assertPartnerCanWrite(partnerId);
}

async function requireActiveWarehouse(partnerId: string, warehouseId: string, submittedName: string, label: string): Promise<string> {
  const warehouse = await getBusinessRecord(partnerId, "inventory-warehouses", warehouseId.trim());
  const name = String(warehouse?.["name"] ?? "").trim();
  if (!warehouse || (warehouse["status"] ?? "Active") !== "Active" || !name) throw new Error(`${label} warehouse is missing or inactive.`);
  if (name !== submittedName.trim()) throw new Error(`${label} warehouse selection does not match its saved record. Refresh and select it again.`);
  return name;
}

async function event(order: { id: string; partnerId: string; status: string }, eventType: string, actor: Actor, toStatus?: string, details?: object) {
  await prisma.wholesaleOrderEvent.create({ data: {
    partnerId: order.partnerId, orderId: order.id, eventType,
    fromStatus: toStatus ? order.status : null, toStatus: toStatus ?? null,
    actorType: actor.type, actorId: actor.id ?? null, note: actor.note?.trim() || null,
    details: details ?? undefined,
  } });
}

export async function startWholesaleProcessing(partnerId: string, orderId: string, actor: Actor) {
  await assertWholesaleWrite(partnerId);
  return withRecordLock("wholesale-order", orderId, async () => {
    const order = await prisma.wholesaleOrder.findFirst({ where: { id: orderId, partnerId } });
    if (!order || order.status !== "Requested") throw new Error("Only a requested PO can move to processing.");
    await event(order, "ProcessingStarted", actor, "Processing");
    await prisma.wholesaleOrder.update({ where: { id: order.id }, data: { status: "Processing" } });
  });
}

export async function allocateWholesaleStock(partnerId: string, orderId: string, input: { warehouseId: string; warehouseName: string; lines: AllocationInput[] }, actor: Actor) {
  await assertWholesaleWrite(partnerId);
  return withRecordLock("wholesale-order", orderId, async () => {
    const order = await prisma.wholesaleOrder.findFirst({
      where: { id: orderId, partnerId }, include: { priceTier: true, lines: { include: { product: true } } },
    });
    if (!order || order.status !== "Processing") throw new Error("Stock can be allocated only while the PO is processing.");
    if (!input.warehouseId.trim() || !input.warehouseName.trim()) throw new Error("Choose the source warehouse.");
    const warehouseName = await requireActiveWarehouse(partnerId, input.warehouseId, input.warehouseName, "Source");
    const requested = new Map(input.lines.map((line) => [line.lineId, Number(line.quantity)]));
    let acceptedUnits = 0;
    const updates: Array<{ id: string; quantity: number }> = [];
    for (const line of order.lines) {
      const product = line.product;
      if (!product?.inventoryMaterialId) throw new Error(`${line.materialLabel} is not mapped to an inventory material.`);
      const quantity = requested.get(line.id);
      if (!Number.isFinite(quantity) || quantity! < 0 || quantity! > line.quantity) throw new Error(`Accepted quantity for ${line.materialLabel} must be between 0 and ${line.quantity}.`);
      if (product.serialized && !Number.isInteger(quantity)) throw new Error(`${line.materialLabel} is serialized and must use whole-unit quantities.`);
      const stock = await findStockRecord(partnerId, product.inventoryMaterialId, warehouseName, "Good");
      const available = Number(stock?.availableQty ?? stock?.qtyOnHand ?? 0);
      if (available < quantity!) throw new Error(`${line.materialLabel}: requested allocation ${quantity}, but only ${available} is available at ${warehouseName}.`);
      acceptedUnits += quantity!;
      updates.push({ id: line.id, quantity: quantity! });
    }
    if (acceptedUnits <= 0) throw new Error("Allocate at least one item, or cancel the PO if nothing can be supplied.");

    for (const line of order.lines) {
      const allocation = updates.find((item) => item.id === line.id)!;
      if (allocation.quantity > 0) await adjustReservedQty(partnerId, line.product!.inventoryMaterialId!, line.materialLabel, warehouseName, allocation.quantity, "Good");
      await prisma.wholesaleOrderLine.update({ where: { id: line.id }, data: { allocatedQuantity: allocation.quantity } });
    }
    const discount = order.priceTier?.discountPercent ?? 0;
    const subtotalAmount = order.lines.reduce((sum, line) => {
      const quantity = updates.find((item) => item.id === line.id)!.quantity;
      return sum + Math.round(discountedUnitPrice(line.unitPrice, discount) * quantity);
    }, 0);
    const taxAmount = order.lines.reduce((sum, line) => {
      const quantity = updates.find((item) => item.id === line.id)!.quantity;
      const base = Math.round(discountedUnitPrice(line.unitPrice, discount) * quantity);
      return sum + Math.round(base * line.gstRateBps / 10000);
    }, 0);
    await event(order, "StockAllocated", actor, "Picking", { warehouseId: input.warehouseId.trim(), warehouseName, lines: updates });
    await prisma.wholesaleOrder.update({ where: { id: order.id }, data: { status: "Picking", warehouseId: input.warehouseId.trim(), warehouseName, subtotalAmount, taxAmount, totalAmount: subtotalAmount + taxAmount } });
  });
}

export async function confirmWholesalePicking(partnerId: string, orderId: string, lines: PickingInput[], actor: Actor) {
  await assertWholesaleWrite(partnerId);
  return withRecordLock("wholesale-order", orderId, async () => {
    const order = await prisma.wholesaleOrder.findFirst({ where: { id: orderId, partnerId }, include: { lines: { include: { product: true } } } });
    if (!order || order.status !== "Picking" || !order.warehouseName) throw new Error("Picking can be confirmed only after stock allocation.");
    const input = new Map(lines.map((line) => [line.lineId, line]));
    const allSerials = new Set<string>();
    for (const line of order.lines) {
      const picked = input.get(line.id);
      const quantity = Number(picked?.quantity);
      if (!Number.isFinite(quantity) || quantity !== line.allocatedQuantity) throw new Error(`${line.materialLabel}: picked quantity must equal allocated quantity ${line.allocatedQuantity}.`);
      const serials = parseSerialNumbers(picked?.serialNumbersRaw);
      if (line.product?.serialized) {
        const validation = validateSerialNumbers(serials, quantity, line.materialLabel);
        if (validation) throw new Error(validation);
        for (const serial of serials) {
          if (allSerials.has(serial)) throw new Error(`Serial/barcode ${serial} was entered more than once in this PO.`);
          allSerials.add(serial);
        }
        const lots = await prisma.stockLot.findMany({ where: { partnerId, warehouseName: order.warehouseName, materialId: line.product.inventoryMaterialId!, serialNumber: { in: serials }, serialized: true, condition: "Good", quantityRemaining: 1 }, select: { id: true, serialNumber: true } });
        if (lots.length !== serials.length) throw new Error(`${line.materialLabel}: one or more serial/barcode numbers are unavailable in ${order.warehouseName}.`);
        await prisma.wholesaleOrderLine.update({ where: { id: line.id }, data: { pickedQuantity: quantity, serialNumbers: serials, serialLotIds: lots.map((lot) => lot.id) } });
      } else {
        if (serials.length) throw new Error(`${line.materialLabel} is non-serialized; serial numbers must be blank.`);
        await prisma.wholesaleOrderLine.update({ where: { id: line.id }, data: { pickedQuantity: quantity, serialNumbers: [] } });
      }
    }
    await event(order, "PickingConfirmed", actor, undefined, { lines: lines.map(({ lineId, quantity }) => ({ lineId, quantity })) });
  });
}

export async function packWholesaleOrder(partnerId: string, orderId: string, actor: Actor) {
  await assertWholesaleWrite(partnerId);
  return withRecordLock("wholesale-order", orderId, async () => {
    const order = await prisma.wholesaleOrder.findFirst({ where: { id: orderId, partnerId }, include: { lines: true } });
    if (!order || order.status !== "Picking") throw new Error("Only a picking-stage PO can be packed.");
    if (order.lines.some((line) => line.pickedQuantity !== line.allocatedQuantity)) throw new Error("Confirm every picked quantity before packing.");
    await event(order, "OrderPacked", actor, "Packed");
    await prisma.wholesaleOrder.update({ where: { id: order.id }, data: { status: "Packed" } });
  });
}

export async function shipWholesaleOrder(partnerId: string, orderId: string, input: { carrier: string; trackingNumber: string; note?: string }, actor: Actor) {
  await assertWholesaleWrite(partnerId);
  return withRecordLock("wholesale-order", orderId, async () => {
    const order = await prisma.wholesaleOrder.findFirst({ where: { id: orderId, partnerId }, include: { lines: { include: { product: true } } } });
    if (!order || order.status !== "Packed" || !order.warehouseId || !order.warehouseName) throw new Error("Only a packed PO with allocated stock can be shipped.");
    if (!input.carrier.trim() || !input.trackingNumber.trim()) throw new Error("Carrier and tracking/LR number are required.");
    // Preflight every line before any stock mutation.
    for (const line of order.lines) {
      if (!line.product?.inventoryMaterialId || line.pickedQuantity !== line.allocatedQuantity) throw new Error(`Stock mapping or picked quantity is incomplete for ${line.materialLabel}.`);
      const stock = await findStockRecord(partnerId, line.product.inventoryMaterialId, order.warehouseName, "Good");
      if (Number(stock?.qtyOnHand ?? 0) < line.pickedQuantity || Number(stock?.reservedQty ?? 0) < line.pickedQuantity) throw new Error(`${line.materialLabel}: allocated stock is no longer available. Reconcile the warehouse before shipping.`);
    }
    for (const line of order.lines) {
      const materialId = line.product!.inventoryMaterialId!;
      if (line.product!.serialized) {
        const serials = Array.isArray(line.serialNumbers) ? line.serialNumbers.map(String) : [];
        const lotIds = Array.isArray(line.serialLotIds) ? line.serialLotIds.map(String) : [];
        await consumeSerializedUnits(partnerId, lotIds.map((lotId, index) => ({ lotId, serialNumber: serials[index] })), order.warehouseName);
      } else {
        await consumeFifo(partnerId, materialId, order.warehouseId, "Good", line.pickedQuantity);
      }
      await adjustReservedQty(partnerId, materialId, line.materialLabel, order.warehouseName, -line.pickedQuantity, "Good");
      await adjustStockQty(partnerId, materialId, line.materialLabel, order.warehouseName, -line.pickedQuantity, "Good");
      await prisma.wholesaleOrderLine.update({ where: { id: line.id }, data: { shippedQuantity: line.pickedQuantity } });
    }
    const now = new Date();
    await createBusinessRecord(partnerId, "wholesale-dispatch", { orderId: order.id, carrier: input.carrier.trim(), trackingNumber: input.trackingNumber.trim(), notes: input.note?.trim() ?? "", dispatchedAt: now.toISOString() });
    await event(order, "OrderShipped", actor, "Shipped", { carrier: input.carrier.trim(), trackingNumber: input.trackingNumber.trim() });
    await prisma.wholesaleOrder.update({ where: { id: order.id }, data: { status: "Shipped", shippedAt: now } });
  });
}

export async function markWholesaleDelivered(partnerId: string, orderId: string, actor: Actor) {
  await assertWholesaleWrite(partnerId);
  return withRecordLock("wholesale-order", orderId, async () => {
    const order = await prisma.wholesaleOrder.findFirst({ where: { id: orderId, partnerId } });
    if (!order || order.status !== "Shipped") throw new Error("Only a shipped PO can be marked delivered.");
    await event(order, "DeliveryConfirmed", actor, "Delivered");
    await prisma.wholesaleOrder.update({ where: { id: order.id }, data: { status: "Delivered", deliveredAt: new Date() } });
  });
}

export async function cancelWholesaleOrder(partnerId: string, orderId: string, actor: Actor) {
  await assertWholesaleWrite(partnerId);
  return withRecordLock("wholesale-order", orderId, async () => {
    const order = await prisma.wholesaleOrder.findFirst({ where: { id: orderId, partnerId }, include: { lines: { include: { product: true } } } });
    if (!order || !["Requested", "Processing", "Picking", "Packed"].includes(order.status)) throw new Error("This PO can no longer be cancelled because stock has shipped or the order is final.");
    if (["Picking", "Packed"].includes(order.status) && order.warehouseName) {
      for (const line of order.lines) if (line.allocatedQuantity > 0 && line.product?.inventoryMaterialId) {
        await adjustReservedQty(partnerId, line.product.inventoryMaterialId, line.materialLabel, order.warehouseName, -line.allocatedQuantity, "Good");
      }
    }
    await event(order, "OrderCancelled", actor, "Cancelled");
    await prisma.wholesaleOrder.update({ where: { id: order.id }, data: { status: "Cancelled" } });
  });
}

export async function receiveWholesaleOrderForDealer(dealerPartnerId: string, orderId: string, input: { warehouseId: string; warehouseName: string }, actor: Actor) {
  await assertWholesaleWrite(dealerPartnerId);
  return withRecordLock("wholesale-order", orderId, async () => {
    const relationship = await prisma.distributorDealerRelationship.findUnique({ where: { dealerPartnerId }, include: { dealer: { select: { subscriptionStatus: true } } } });
    if (!relationship || relationship.status !== "Active" || relationship.dealer.subscriptionStatus !== "Active") throw new Error("This dealer account is not active for stock receipt.");
    const order = await prisma.wholesaleOrder.findFirst({ where: { id: orderId, partnerId: relationship.distributorPartnerId, customerId: relationship.wholesaleCustomerId }, include: { lines: { include: { product: true } } } });
    if (!order || order.status !== "Delivered") throw new Error("Only a delivered PO can be received into dealer stock.");
    if (!input.warehouseId.trim() || !input.warehouseName.trim()) throw new Error("Choose the dealer warehouse receiving this stock.");
    const warehouseName = await requireActiveWarehouse(dealerPartnerId, input.warehouseId, input.warehouseName, "Receiving");
    for (const line of order.lines) {
      const product = line.product;
      if (!product || line.shippedQuantity <= 0) continue;
      const dealerMaterialId = product.sku;
      const serials = Array.isArray(line.serialNumbers) ? line.serialNumbers.map(String) : [];
      if (product.serialized) {
        const validation = validateSerialNumbers(serials, line.shippedQuantity, product.name);
        if (validation) throw new Error(validation);
      }
      await createStockLots({ partnerId: dealerPartnerId, warehouseId: input.warehouseId.trim(), warehouseName, materialId: dealerMaterialId, materialLabel: `${product.sku} - ${product.name}`, condition: "Good", serialized: product.serialized, serialNumbers: product.serialized ? serials : undefined, quantity: product.serialized ? undefined : line.shippedQuantity, unitCost: line.unitPrice, sourceType: "wholesale-receipt", sourceRecordId: order.id });
      await adjustStockQty(dealerPartnerId, dealerMaterialId, `${product.sku} - ${product.name}`, warehouseName, line.shippedQuantity, "Good");
      await prisma.wholesaleOrderLine.update({ where: { id: line.id }, data: { receivedQuantity: line.shippedQuantity } });
    }
    const now = new Date();
    await createBusinessRecord(dealerPartnerId, "inventory-receipt", { sourceType: "Distributor PO", sourceRecordId: order.id, distributorPartnerId: order.partnerId, orderNumber: order.orderNumber, warehouseId: input.warehouseId.trim(), warehouseName, receivedAt: now.toISOString(), status: "Posted" });
    await event(order, "DealerStockReceived", actor, "Received", { dealerPartnerId, warehouseId: input.warehouseId.trim(), warehouseName });
    await prisma.wholesaleOrder.update({ where: { id: order.id }, data: { status: "Received", receivedAt: now } });
  });
}
