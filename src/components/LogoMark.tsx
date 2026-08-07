type LogoMarkProps = {
  size?: number;
  className?: string;
};

/**
 * MBF logo mark: three connected circular nodes (two feeding a third),
 * teal / amber / teal, joined by border-colored strokes.
 * ViewBox 0 0 40 40 — legible from favicon size up through a 40px+
 * marketing/login header.
 */
export function LogoMark({ size = 24, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="My Biz Flow"
    >
      <line x1="10" y1="10" x2="27" y2="20" stroke="var(--border)" strokeWidth="2" />
      <line x1="10" y1="30" x2="27" y2="20" stroke="var(--border)" strokeWidth="2" />
      <circle cx="10" cy="10" r="6.5" fill="var(--teal)" />
      <circle cx="10" cy="30" r="6.5" fill="var(--teal)" />
      <circle cx="29" cy="20" r="7.5" fill="var(--accent)" />
    </svg>
  );
}
