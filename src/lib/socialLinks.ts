import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export type SocialLinks = Record<"instagramUrl" | "facebookUrl" | "linkedinUrl" | "youtubeUrl" | "xUrl" | "whatsappUrl", string | null>;
async function loadPublicSocialLinks(): Promise<SocialLinks> {
  try {
    const rows = await prisma.$queryRaw<SocialLinks[]>`SELECT "instagramUrl", "facebookUrl", "linkedinUrl", "youtubeUrl", "xUrl", "whatsappUrl" FROM "platform_social_links" WHERE "id" = 'default'`;
    return rows[0] ?? { instagramUrl: null, facebookUrl: null, linkedinUrl: null, youtubeUrl: null, xUrl: null, whatsappUrl: null };
  } catch { return { instagramUrl: null, facebookUrl: null, linkedinUrl: null, youtubeUrl: null, xUrl: null, whatsappUrl: null }; }
}

const getPublicSocialLinksCached = unstable_cache(loadPublicSocialLinks,
  ["public-social-links"], { revalidate: 600, tags: ["public-social-links"] });

export async function getPublicSocialLinks(): Promise<SocialLinks> {
  try {
    return await getPublicSocialLinksCached();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return loadPublicSocialLinks();
    }
    throw error;
  }
}
