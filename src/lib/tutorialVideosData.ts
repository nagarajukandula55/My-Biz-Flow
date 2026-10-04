import { prisma } from "@/lib/prisma";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";

export type TutorialVideo = {
  id: string;
  title: string;
  youtubeId: string;
  description: string | null;
  moduleSlugs: string[];
  sectionSlug: string | null;
};

/**
 * Active tutorial videos relevant to this partner — a video with no
 * moduleSlugs is shown to everyone, otherwise it must share at least one
 * slug with the partner's own visible modules (getVisibleModuleSlugs).
 * Managed from My-Biz-Flow-Admin's /admin/tutorials; both repos read/write
 * the same `tutorial_videos` table on the shared DB.
 */
export async function getTutorialVideosForPartner(partnerId: string): Promise<TutorialVideo[]> {
  const [videos, visibleSlugs] = await Promise.all([
    prisma.tutorialVideo.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getVisibleModuleSlugs(partnerId),
  ]);
  const visible = new Set(visibleSlugs);
  return videos.filter((v) => v.moduleSlugs.length === 0 || v.moduleSlugs.some((slug) => visible.has(slug)));
}
