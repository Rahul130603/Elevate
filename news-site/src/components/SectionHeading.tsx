import Link from "next/link";

export function SectionHeading({
  title,
  href,
  viewAllLabel,
  icon,
  id,
}: {
  title: string;
  href?: string;
  viewAllLabel?: string;
  icon?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 border-b border-ink-200 pb-3 dark:border-ink-800">
      <h2 id={id} className="headline flex items-center gap-2 text-lg font-bold sm:text-xl">
        <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
        {icon}
        {title}
      </h2>
      {href && viewAllLabel ? (
        <Link
          href={href}
          className="shrink-0 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          {viewAllLabel}
        </Link>
      ) : null}
    </div>
  );
}
