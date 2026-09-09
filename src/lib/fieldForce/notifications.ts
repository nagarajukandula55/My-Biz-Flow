/**
 * A simple in-app notification feed, polled on page load (no
 * websockets/push yet). "ops" notifications have no recipientId — any
 * partner staff viewing Field Force sees them; "customer"/"provider"
 * notifications always carry a recipientId.
 */
import { prisma } from "@/lib/prisma";

export type NotificationAudience = "ops" | "customer" | "provider";

export type NotificationRecord = {
  id: string;
  partnerId: string;
  audience: NotificationAudience;
  recipientId: string | null;
  type: string;
  title: string;
  body: string;
  relatedBookingId: string | null;
  isRead: boolean;
  createdAt: Date;
};

export async function notify(input: {
  partnerId: string;
  audience: NotificationAudience;
  recipientId?: string;
  type: string;
  title: string;
  body: string;
  relatedBookingId?: string;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      partnerId: input.partnerId,
      audience: input.audience,
      recipientId: input.recipientId || null,
      type: input.type,
      title: input.title,
      body: input.body,
      relatedBookingId: input.relatedBookingId || null,
    },
  });
}

export async function listNotifications(
  partnerId: string,
  audience: NotificationAudience,
  recipientId?: string
): Promise<NotificationRecord[]> {
  return prisma.notification.findMany({
    where: { partnerId, audience, recipientId: recipientId ?? null },
    orderBy: { createdAt: "desc" },
    take: 50,
  }) as Promise<NotificationRecord[]>;
}

export async function markRead(id: string): Promise<void> {
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function unreadCount(partnerId: string, audience: NotificationAudience, recipientId?: string): Promise<number> {
  return prisma.notification.count({
    where: { partnerId, audience, recipientId: recipientId ?? null, isRead: false },
  });
}
