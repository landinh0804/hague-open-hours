import { useEffect, useState } from "react";
import { ChevronDown, Navigation, Wifi, PlugZap, Pencil, MapPin } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { KIND_LABEL, directionsUrl, formatDistance, osmObjectUrl } from "@/lib/places";
import { UNKNOWN_REASON_LABEL, type HoursStatus } from "@/lib/hours";
import type { PlaceView } from "@/lib/view";
import { cn } from "@/lib/utils";

const PAGE = 30;

const STATUS_STYLE: Record<HoursStatus, { label: string; pill: string; dot: string }> = {
  open: { label: "Open then", pill: "bg-open text-open-foreground", dot: "bg-open" },
  closed: { label: "Closed then", pill: "bg-closed-soft text-closed", dot: "bg-closed" },
  unknown: { label: "Hours unknown", pill: "bg-unknown-soft text-unknown", dot: "bg-unknown" },
};

interface ListProps {
  showBadges: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function PlaceItem({ view, showBadges, selected, onSelect }: { view: PlaceView; showBadges: boolean; selected: boolean; onSelect: (id: string) => void }) {
  const { place, result, distance } = view;
  const style = STATUS_STYLE[result.status];
  return (
    <li
      id={`place-${place.id}`}
      className={cn(
        "scroll-mt-24 rounded-2xl border bg-card shadow-card transition-colors",
        selected ? "border-primary shadow-glow" : "hover:border-input",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(place.id)}
        aria-pressed={selected}
        className="block w-full rounded-t-2xl px-4 pt-4 pb-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-snug break-words">{place.name}</h3>
            <p className="text-sm text-muted-foreground">
              {KIND_LABEL[place.kind]}
              {distance != null && (
                <>
                  {" · "}
                  <span className="font-semibold text-foreground">{formatDistance(distance)}</span>
                </>
              )}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", style.pill)}>
            {result.status === "open" ? "Open" : result.status === "closed" ? "Closed" : "Unknown"}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold tabular-nums break-words text-foreground/90">
          {place.hours ?? <span className="font-sans text-muted-foreground">No hours listed</span>}
        </p>
        {result.status === "unknown" && result.reason && result.reason !== "missing" && (
          <p className="mt-1 text-xs text-muted-foreground">{UNKNOWN_REASON_LABEL[result.reason]}</p>
        )}
        {showBadges && (place.wifi || place.power) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {place.wifi && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                <Wifi className="size-3.5" aria-hidden /> Wi-Fi
              </span>
            )}
            {place.power && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                <PlugZap className="size-3.5" aria-hidden /> Power sockets
              </span>
            )}
          </div>
        )}
      </button>
      <div className="flex flex-wrap items-center gap-1 border-t border-border/60 px-2 py-1.5">
        <Button asChild variant="ghost" size="touch" className="text-primary">
          <a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
            <Navigation aria-hidden /> Directions
          </a>
        </Button>
        <Button variant="ghost" size="touch" type="button" onClick={() => onSelect(place.id)}>
          <MapPin aria-hidden /> Show on map
        </Button>
        <Button asChild variant="ghost" size="touch" className="ml-auto text-sm text-muted-foreground">
          <a href={osmObjectUrl(place.id)} target="_blank" rel="noopener noreferrer" aria-label={`Report wrong hours for ${place.name} on OpenStreetMap`}>
            <Pencil aria-hidden /> Wrong hours?
          </a>
        </Button>
      </div>
    </li>
  );
}

function ItemList({ views, ...props }: ListProps & { views: PlaceView[] }) {
  const [limit, setLimit] = useState(PAGE);
  const selectedIndex = props.selectedId ? views.findIndex((v) => v.place.id === props.selectedId) : -1;

  useEffect(() => {
    if (selectedIndex >= limit) setLimit(selectedIndex + PAGE);
  }, [selectedIndex, limit]);

  useEffect(() => setLimit(PAGE), [views.length]);

  return (
    <>
      <ul className="space-y-3">
        {views.slice(0, limit).map((v) => (
          <PlaceItem
            key={v.place.id}
            view={v}
            showBadges={props.showBadges}
            selected={v.place.id === props.selectedId}
            onSelect={props.onSelect}
          />
        ))}
      </ul>
      {views.length > limit && (
        <Button variant="soft" size="touch" className="mt-3 w-full" onClick={() => setLimit((l) => l + PAGE)}>
          Show more ({views.length - limit} left)
        </Button>
      )}
    </>
  );
}

function GroupHeading({ status, count }: { status: HoursStatus; count: number }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className={cn("size-3 rounded-full", s.dot)} />
      <span className="text-xl font-semibold">{s.label}</span>
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-sm font-semibold tabular-nums">{count}</span>
    </span>
  );
}

export function PlaceGroups({
  open,
  closed,
  unknown,
  unknownOpen,
  onUnknownOpenChange,
  ...props
}: ListProps & {
  open: PlaceView[];
  closed: PlaceView[];
  unknown: PlaceView[];
  unknownOpen: boolean;
  onUnknownOpenChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="group-open">
        <h2 id="group-open" className="mb-3">
          <GroupHeading status="open" count={open.length} />
        </h2>
        {open.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-4 text-muted-foreground">
            No places in this list are open at the time you picked, according to OpenStreetMap. Try another time, or
            check the places with unknown hours below.
          </p>
        ) : (
          <ItemList views={open} {...props} />
        )}
      </section>

      <section aria-labelledby="group-closed">
        <h2 id="group-closed" className="mb-3">
          <GroupHeading status="closed" count={closed.length} />
        </h2>
        {closed.length === 0 ? (
          <p className="text-muted-foreground">None.</p>
        ) : (
          <ItemList views={closed} {...props} />
        )}
      </section>

      <Collapsible open={unknownOpen} onOpenChange={onUnknownOpenChange} asChild>
        <section aria-labelledby="group-unknown">
          <h2 id="group-unknown">
            <CollapsibleTrigger className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-2 text-left hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <GroupHeading status="unknown" count={unknown.length} />
              <ChevronDown aria-hidden className={cn("size-6 shrink-0 transition-transform", unknownOpen && "rotate-180")} />
            </CollapsibleTrigger>
          </h2>
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            Many places in OpenStreetMap have no opening hours. These are not shown as open — check with the place
            before you go.
          </p>
          <CollapsibleContent className="mt-3">
            {unknown.length === 0 ? <p className="text-muted-foreground">None.</p> : <ItemList views={unknown} {...props} />}
          </CollapsibleContent>
        </section>
      </Collapsible>
    </div>
  );
}
