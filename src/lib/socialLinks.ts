import { prisma } from "@/lib/prisma";

export type SocialLinks = Record<"instagramUrl" | "facebookUrl" | "linkedinUrl" | "youtubeUrl" | "xUrl" | "whatsappUrl", string | null>;
export async function getPublicSocialLinks(): Promise<SocialLinks> {
  try {
    const rows = await prisma.$queryRaw<SocialLinks[]>`SELECT "instagramUrl", "facebookUrl", "linkedinUrl", "youtubeUrl", "xUrl", "whatsappUrl" FROM "platform_social_links" WHERE "id" = 'default'`;
    return rows[0] ?? { instagramUrl: null, facebookUrl: null, linkedinUrl: null, youtubeUrl: null, xUrl: null, whatsappUrl: null };
  } catch { return { instagramUrl: null, facebookUrl: null, linkedinUrl: null, youtubeUrl: null, xUrl: null, whatsappUrl: null }; }
}
