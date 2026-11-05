import { Clock, Moon, Sun, Zap, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAYS_SHORT, formatWhen, presetWhen, amsterdamNow, type PresetId, type When } from "@/lib/hours";

const PRESETS: { id: PresetId; label: string; icon: typeof Clock }[] = [
  { id: "now", label: "Now", icon: Zap },
  { id: "tonight", label: "Tonight 23:00", icon: Moon },
  { id: "friday", label: "Friday 20:00", icon: PartyPopper },
  { id: "saturday", label: "Saturday 14:00", icon: Sun },
];

export function TimePicker({
  when,
  onChange,
}: {
  when: When | null;
  onChange: (w: When) => void;
}) {
  if (!when) {
    return (
      <section aria-label="Choose day and time" className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((p) => (
            <div key={p.id} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  const today = amsterdamNow().weekday;

  return (
    <section aria-label="Choose day and time" className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold">When do you want to go?</h2>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing: <span className="font-semibold text-primary">{formatWhen(when)}</span>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant="chip"
            size="touch"
            aria-pressed={when.preset === p.id}
            onClick={() => onChange(presetWhen(p.id))}
          >
            <p.icon aria-hidden />
            {p.label}
          </Button>
        ))}
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-muted-foreground">Day</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS_SHORT.map((d, i) => (
            <Button
              key={d}
              type="button"
              variant="chip"
              size="touch"
              className="relative px-0 text-sm"
              aria-pressed={when.day === i}
              aria-label={i === today ? `${d} (today)` : d}
              onClick={() => onChange({ day: i, time: when.time })}
            >
              {d}
              {i === today && (
                <span aria-hidden className="absolute bottom-1.5 h-1 w-1 rounded-full bg-current opacity-70" />
              )}
            </Button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 flex items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Clock className="size-5" aria-hidden /> Time
        </span>
        <input
          type="time"
          value={when.time}
          step={300}
          required
          onChange={(e) => e.target.value && onChange({ day: when.day, time: e.target.value })}
          className="h-12 flex-1 rounded-xl border border-input bg-surface px-4 text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">Times are in The Hague (Europe/Amsterdam).</p>
    </section>
  );
}
