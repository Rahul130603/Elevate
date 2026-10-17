import React, { useEffect, useRef } from 'react';
import industries from '../../config/industries.json';

export function AdminIndustryNews({ industry, onOpenSidebar }) {
  const frameRef = useRef(null);
  useEffect(() => {
    const openMenu = (event) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === 'elevate:open-admin-menu') onOpenSidebar?.();

    };
    window.addEventListener('message', openMenu);
    return () => window.removeEventListener('message', openMenu);
  }, [onOpenSidebar]);
  const selected = industries.find(item => item.id === industry);
  if (!selected) return <p>Please sign out and select an industry when signing in.</p>;
  // The admin shell applies an 80% desktop zoom. Compensate the iframe's CSS
  // viewport height so the embedded news page still reaches the bottom edge.
  return <section className="h-[calc(100dvh-80px)] lg:h-[125dvh]">
    <iframe ref={frameRef} key={industry} title={`${selected.label} news`} src={`/admin-news/en/industry/${industry}`} className="block h-full w-full border-0 bg-white" />
  </section>;
}
