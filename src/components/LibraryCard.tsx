import { BookOpen, ExternalLink } from "lucide-react";
import { HHS_LIBRARY, type LibraryStatus } from "@/lib/hours";
import { cn } from "@/lib/utils";

const ROWS = [
  { day: "Monday – Thursday", hours: "09:00 – 22:30" },
  { day: "Friday", hours: "09:00 – 18:00" },
  { day: "Saturday – Sunday", hours: "Not listed" },
];

const STATUS_TEXT: Record<LibraryStatus, string> = {
  open: "Open at your chosen time",
  closed: "Closed at your chosen time",
  "not-listed": "No weekend hours listed",
};

export function LibraryCard({ status }: { status: LibraryStatus | null }) {
  return (
    <section
      aria-labelledby="hhs-library-title"
      className="rounded-2xl border border-primary/40 bg-primary-soft p-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="hhs-library-title" className="text-lg font-semibold leading-tight">
            Haagse Hogeschool library
          </h2>
          <p className="text-sm text-muted-foreground">Official hours, main library</p>
        </div>
        {status && (
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
              status === "open" && "bg-open text-open-foreground",
              status === "closed" && "bg-closed-soft text-closed",
              status === "not-listed" && "bg-unknown-soft text-unknown",
            )}
          >
            {STATUS_TEXT[status]}
          </span>
        )}
      </div>

      <dl className="mt-3 divide-y divide-border/60 text-base">
        {ROWS.map((r) => (
          <div key={r.day} className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">{r.day}</dt>
            <dd className="font-semibold tabular-nums">{r.hours}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm text-muted-foreground">Holiday hours differ.</p>
      <a
        href={HHS_LIBRARY.source}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-link"
      >
        Check the source, hours can change
        <ExternalLink className="size-4" aria-hidden />
      </a>
    </section>
  );
}
