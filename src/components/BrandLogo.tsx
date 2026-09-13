import Image from "next/image";

/**
 * Real brand artwork (public/logo-full.png), shared with AN-CRM's own
 * marketing pages — both apps' public-facing product name is "My Biz
 * Flow". The artwork's wordmark is dark navy, so it carries its own
 * small white pill backdrop for legibility regardless of the page's own
 * light/dark theme, matching how the source artwork is used elsewhere.
 */
export function BrandLogo({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <span className={`inline-flex items-center rounded-lg bg-white px-2 py-1 shadow-sm ${className}`}>
      <Image
        src="/logo-full.png"
        alt="My Biz Flow"
        width={1968}
        height={1096}
        style={{ height, width: "auto" }}
        className="object-contain"
        priority
      />
    </span>
  );
}
