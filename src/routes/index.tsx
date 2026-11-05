import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Archive, BookOpen, CloudOff, Radio, Crosshair, LocateOff, RefreshCw, Search, UtensilsCrossed, X } from "lucide-react";
import { TimePicker } from "@/components/TimePicker";
import { LibraryCard } from "@/components/LibraryCard";
import { PlaceGroups } from "@/components/PlaceList";
import { Button } from "@/components/ui/button";
import { classify, hhsLibraryStatus, presetWhen, whenToDate, type When } from "@/lib/hours";
import { clearCache, distanceMeters, fetchPlaces, formatSnapshotDate, type Category, type LatLon } from "@/lib/places";
import type { PlaceView, Selection } from "@/lib/view";
import { cn } from "@/lib/utils";

const PlaceMap = lazy(() => import("@/components/PlaceMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Late Hague — late study spots and food in The Hague" },
      {
        name: "description",
        content:
          "Find study places and food spots in The Hague that are open late, at night or at weekends — for students when the library is closed.",
      },
      { property: "og:title", content: "Late Hague — late study spots and food in The Hague" },
      {
        property: "og:description",
        content: "Which cafés, libraries and food spots in Den Haag are open at the time you want to study or eat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type GeoState = "idle" | "locating" | "denied" | "error";

function MapFallback() {
  return (
    <div className="grid h-full w-full place-items-center bg-surface text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}

function Index() {
  const [when, setWhen] = useState<When | null>(null);
  const [tab, setTab] = useState<Category>("study");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [search, setSearch] = useState("");
  const [userPos, setUserPos] = useState<LatLon | null>(null);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [unknownOpen, setUnknownOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Default to the current Amsterdam time after hydration (avoids server/client mismatch).
  useEffect(() => setWhen(presetWhen("now")), []);

  const query = useQuery({
    queryKey: ["places"],
    queryFn: () => fetchPlaces(),
    staleTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const date = useMemo(() => (when ? whenToDate(when) : null), [when]);

  const groups = useMemo(() => {
    const empty = { open: [] as PlaceView[], closed: [] as PlaceView[], unknown: [] as PlaceView[], all: [] as PlaceView[] };
    if (!query.data || !date) return empty;
    const q = search.trim().toLowerCase();
    const views: PlaceView[] = [];
    for (const place of query.data.places) {
      if (place.category !== tab) continue;
      if (q && !place.name.toLowerCase().includes(q)) continue;
      views.push({
        place,
        result: classify(place.hours, date),
        distance: userPos ? distanceMeters(userPos, place) : undefined,
      });
    }
    views.sort((a, b) =>
      userPos ? (a.distance ?? 0) - (b.distance ?? 0) : a.place.name.localeCompare(b.place.name, "nl"),
    );
    for (const v of views) empty[v.result.status].push(v);
    empty.all = views;
    return empty;
  }, [query.data, date, tab, search, userPos]);

  const switchTab = (t: Category) => {
    setTab(t);
    setSelection(null);
    setUnknownOpen(false);
  };

  const selectFromList = useCallback((id: string) => {
    setSelection({ id, token: Date.now(), source: "list" });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const selectFromMap = useCallback(
    (id: string) => {
      setSelection({ id, token: Date.now(), source: "map" });
      if (groups.unknown.some((v) => v.place.id === id)) setUnknownOpen(true);
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setTimeout(() => {
          document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 80);
      }
    },
    [groups.unknown],
  );

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeo("error");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Kept only in memory on this device — never stored or sent.
        setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeo("idle");
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  };

  const refresh = () => {
    clearCache();
    void query.refetch();
  };

  const libraryStatus = when && date ? hhsLibraryStatus(when, date) : null;
  const total = groups.all.length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6">
      <div className="space-y-4 lg:col-start-1 lg:row-start-1">
        <div className="pt-2">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Library closed? <span className="text-primary">Find what's open.</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Study places and food in Den Haag, checked against their opening hours on OpenStreetMap.
          </p>
        </div>

        <TimePicker when={when} onChange={setWhen} />

        <div role="tablist" aria-label="Kind of place" className="grid grid-cols-2 gap-1 rounded-2xl border bg-surface p-1">
          {(
            [
              { id: "study", label: "Study", icon: BookOpen },
              { id: "food", label: "Food", icon: UtensilsCrossed },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls="results"
              onClick={() => switchTab(t.id)}
              className={cn(
                "flex h-14 items-center justify-center gap-2 rounded-xl text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.id ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
              )}
            >
              <t.icon className="size-5" aria-hidden />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "study" && <LibraryCard status={libraryStatus} />}

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {userPos ? (
              <Button variant="soft" size="touch" onClick={() => { setUserPos(null); setGeo("idle"); }}>
                <LocateOff aria-hidden /> Stop using my location
              </Button>
            ) : (
              <Button variant="night" size="touch" onClick={locate} disabled={geo === "locating"}>
                <Crosshair aria-hidden /> {geo === "locating" ? "Finding you…" : "Near me"}
              </Button>
            )}
            <label className="relative min-w-0 flex-1 basis-48">
              <span className="sr-only">Search by name</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                className="h-12 w-full rounded-xl border border-input bg-surface pr-10 pl-11 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="size-5" aria-hidden />
                </button>
              )}
            </label>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {geo === "denied" && "Location permission was not given, so distances are hidden. You can still use the list and map."}
            {geo === "error" && "Your location could not be found. Distances are hidden."}
            {userPos && "Sorted by distance. Your location stays on this device — it is never stored or sent."}
            {geo === "idle" && !userPos && "Press Near me to see distances. Your location is never stored or sent."}
          </p>
        </div>
      </div>

      <div
        ref={mapRef}
        className="relative z-0 mt-4 h-[45vh] min-h-72 scroll-mt-20 overflow-hidden rounded-2xl border shadow-card lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-2 lg:h-[calc(100vh-7rem)]"
      >
        <ClientOnly fallback={<MapFallback />}>
          <Suspense fallback={<MapFallback />}>
            <PlaceMap views={groups.all} selection={selection} onSelect={selectFromMap} userPos={userPos} />
          </Suspense>
        </ClientOnly>
        <div className="pointer-events-none absolute top-3 right-3 z-[500] flex flex-col gap-1 rounded-xl border bg-background/85 px-3 py-2 text-xs backdrop-blur">
          <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-open" /> Open then</span>
          <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-closed" /> Closed then</span>
          <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-unknown" /> Hours unknown</span>
        </div>
      </div>

      <section id="results" aria-live="polite" aria-busy={query.isLoading} className="mt-6 lg:col-start-1 lg:row-start-2">
        {query.data?.source === "saved" && (
          <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/50 bg-primary-soft p-4">
            <CloudOff className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">
                Live data is unavailable, showing saved data from {formatSnapshotDate(query.data.snapshotDate ?? "2026-11-05")}.
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">Hours may have changed since then.</p>
            </div>
          </div>
        )}
        {query.isLoading || (!query.data && !query.isError) ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <RefreshCw className="size-5 animate-spin text-primary" aria-hidden />
              <p>
                Loading places from OpenStreetMap…
                <span className="block text-sm text-muted-foreground">The first load can take up to a minute.</span>
              </p>
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : query.isError ? (
          <div role="alert" className="rounded-2xl border border-destructive/60 bg-card p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-6 shrink-0 text-destructive" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold">Places could not be loaded</h2>
                <p className="mt-1 text-muted-foreground">
                  {(query.error as Error)?.message || "Something went wrong."} The library hours above still work.
                </p>
                <Button variant="night" size="touch" className="mt-3" onClick={refresh}>
                  <RefreshCw aria-hidden /> Try again
                </Button>
              </div>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <h2 className="text-lg font-semibold">No places found</h2>
            <p className="mt-1 text-muted-foreground">
              {search ? `Nothing matches "${search}" on the ${tab === "study" ? "Study" : "Food"} tab.` : "OpenStreetMap returned no places for this tab."}
            </p>
            {search && (
              <Button variant="soft" size="touch" className="mt-3" onClick={() => setSearch("")}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {total} {tab === "study" ? "study places" : "food spots"} · {groups.open.length} open then
              </span>
              <span className="flex items-center gap-1">
                {query.data!.source === "live" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-open-soft px-2.5 py-1 font-semibold text-open">
                    <Radio className="size-3.5" aria-hidden />
                    Live data · loaded {new Date(query.data!.savedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary">
                    <Archive className="size-3.5" aria-hidden />
                    Saved data from {formatSnapshotDate(query.data!.snapshotDate ?? "2026-11-05")}
                  </span>
                )}
                <Button variant="ghost" size="sm" className="h-10" onClick={refresh} disabled={query.isFetching}>
                  <RefreshCw className={cn(query.isFetching && "animate-spin")} aria-hidden /> Refresh
                </Button>
              </span>
            </div>
            <PlaceGroups
              open={groups.open}
              closed={groups.closed}
              unknown={groups.unknown}
              unknownOpen={unknownOpen}
              onUnknownOpenChange={setUnknownOpen}
              showBadges={tab === "study"}
              selectedId={selection?.id ?? null}
              onSelect={selectFromList}
            />
          </>
        )}
      </section>
    </div>
  );
}
