import type { TutorialVideo } from "@/lib/tutorialVideosData";

/** Lite, privacy-friendly embed — youtube-nocookie.com, no autoplay. */
function VideoEmbed({ video }: { video: TutorialVideo }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-raised">
      <div className="aspect-video w-full bg-bg-sunken">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.title}
          className="h-full w-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-text">{video.title}</p>
        {video.description && <p className="mt-1 text-xs text-text-muted">{video.description}</p>}
      </div>
    </div>
  );
}

/** General (unsectioned) tutorial videos — shown at the top of the Help page. */
export function TutorialVideoGrid({ videos }: { videos: TutorialVideo[] }) {
  if (videos.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="font-display text-sm font-bold text-text">Tutorial Videos</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <VideoEmbed key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}

export { VideoEmbed };
