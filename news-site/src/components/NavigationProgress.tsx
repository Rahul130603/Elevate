"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * A thin bar that appears the instant an internal link is clicked and disappears
 * when the new page has rendered, so navigation never feels like nothing
 * happened — even on a slow feed fetch.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return;
      if (`${location.pathname}${location.search}` === href) return;

      setActive(true);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // The route changed: the new page is on screen.
  useEffect(() => {
    setActive(false);
  }, [pathname]);

  // Safety net, in case a navigation is cancelled.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setActive(false), 8_000);
    return () => clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-brand-100 dark:bg-brand-900/40"
    >
      <span className="nav-progress block h-full w-1/3 bg-brand-600 dark:bg-brand-400" />
    </div>
  );
}
