/** Transparent logo with padding around the full artwork, preserving its ratio. */
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="80 166 1661 517" width="180" height="56" role="img" aria-label="Elevate" className={className}>
      <title>Elevate</title>
      <image href="/admin-news/elevate-logo-transparent.png" width="1821" height="864" />
      <svg x="630" y="166" width="1111" height="517" viewBox="630 166 1111 517" className="hidden dark:block" aria-hidden="true">
        <image href="/admin-news/elevate-logo-transparent.png" width="1821" height="864" style={{ filter: 'invert(1)' }} />
      </svg>
    </svg>
  );
}
