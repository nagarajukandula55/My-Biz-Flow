import { DocumentView } from "@/components/DocumentView";
import { amcFieldServiceColumns } from "@/lib/sample-data/amc-field-service";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getAmcContract } from "@/lib/amcContractsData";

registerPage({
  id: "amc-field-service.document",
  moduleSlug: "amc-field-service",
  title: "Service Report — Document",
  path: "/partner/[partnerId]/amc-field-service/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Service Report HTML template (placeholders)" },
  ],
  explanation:
    "Renders an AMC/Field Service visit as a printable service report — includes the technician check-in geo/IP fields already captured on the record. Same template-or-default rendering as every other document page.",
  sourceFile: "src/app/partner/[partnerId]/amc-field-service/[recordId]/document/page.tsx",
});

export default async function AmcFieldServiceDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const contract = await getAmcContract(params.partnerId, params.recordId);
  if (!contract) notFound();
  const latestVisit = contract.serviceVisits[0];
  const record = {
    id: contract.id,
    customer: contract.customer,
    equipment: contract.equipment,
    technicianName: latestVisit?.technicianName ?? "",
    contractEndDate: contract.contractEndDate.toISOString().slice(0, 10),
    slaHours: contract.slaHours,
    contractValue: contract.contractValue,
    status: latestVisit?.status ?? "Scheduled",
    contractStatus: contract.contractStatus,
    checkInLatitude: latestVisit?.checkInLatitude ?? null,
    checkInLongitude: latestVisit?.checkInLongitude ?? null,
  };
  const partner = await getPartner(params.partnerId);
  // Sequence index within the AmcContract stream, newest-created-last — mirrors what
  // getBusinessRecordSequenceIndex computed for the retired BusinessRecord-backed version.
  const { prisma } = await import("@/lib/prisma");
  const earlierCount = await prisma.amcContract.count({
    where: { partnerId: params.partnerId, createdAt: { lt: contract.createdAt } },
  });
  const sequenceIndex = earlierCount + 1;
  return (
    <DocumentView
      pageId="amc-field-service.document"
      documentType="amc-field-service.document"
      documentLabel="Service Report"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={amcFieldServiceColumns}
      sequenceIndex={sequenceIndex}
    />
  );
}
