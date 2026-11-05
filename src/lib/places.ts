export type Category = "study" | "food";
export type PlaceKind =
  | "library"
  | "coworking"
  | "cafe"
  | "fast_food"
  | "restaurant"
  | "supermarket"
  | "convenience";

export const KIND_LABEL: Record<PlaceKind, string> = {
  library: "Library",
  coworking: "Coworking space",
  cafe: "Café",
  fast_food: "Fast food",
  restaurant: "Restaurant",
  supermarket: "Supermarket",
  convenience: "Convenience store",
};

export const KIND_CATEGORY: Record<PlaceKind, Category> = {
  library: "study",
  coworking: "study",
  cafe: "study",
  fast_food: "food",
  restaurant: "food",
  supermarket: "food",
  convenience: "food",
};

export interface Place {
  id: string; // e.g. "node/123"
  name: string;
  lat: number;
  lon: number;
  kind: PlaceKind;
  category: Category;
  hours?: string | undefined;
  wifi: boolean;
  power: boolean;
}

export const OVERPASS_QUERY = `[out:json][timeout:25];
area["name"="Den Haag"]["admin_level"="8"]->.a;
(
  nwr["amenity"="library"](area.a);
  nwr["amenity"="cafe"](area.a);
  nwr["amenity"="coworking_space"](area.a);
  nwr["office"="coworking"](area.a);
  nwr["amenity"="fast_food"](area.a);
  nwr["shop"="convenience"](area.a);
  nwr["shop"="supermarket"](area.a);
  nwr["amenity"="restaurant"](area.a);
);
out center tags;`;

interface Tags {
  amenity?: string;
  office?: string;
  shop?: string;
  internet_access?: string;
  power_supply?: string;
  opening_hours?: string;
  name?: string;
  brand?: string;
  [key: string]: string | undefined;
}

export function kindFromTags(tags: Tags): PlaceKind | null {
  const amenity = tags.amenity;
  if (amenity === "library") return "library";
  if (amenity === "coworking_space" || tags.office === "coworking") return "coworking";
  if (amenity === "cafe") return "cafe";
  if (amenity === "fast_food") return "fast_food";
  if (amenity === "restaurant") return "restaurant";
  if (tags.shop === "supermarket") return "supermarket";
  if (tags.shop === "convenience") return "convenience";
  return null;
}

/** Wi-Fi only when OSM says internet_access=wlan or yes. */
export function hasWifi(tags: Tags): boolean {
  const v = tags.internet_access?.trim().toLowerCase();
  return v === "wlan" || v === "yes";
}

/** Power sockets only when a power_supply or socket tag says so. */
export function hasPower(tags: Tags): boolean {
  const no = (v: string | undefined) => {
    const s = v?.trim().toLowerCase();
    return !s || s === "no" || s === "0";
  };
  if (!no(tags.power_supply)) return true;
  return Object.entries(tags).some(
    ([k, v]) => (k === "socket" || k.startsWith("socket:")) && !no(v),
  );
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Tags;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function elementToPlace(el: OverpassElement): Place | null {
  const tags = el.tags ?? {};
  const kind = kindFromTags(tags);
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!kind || lat == null || lon == null) return null;
  const hours = tags.opening_hours?.trim();
  return {
    id: `${el.type}/${el.id}`,
    name: tags.name?.trim() || tags.brand?.trim() || `Unnamed ${KIND_LABEL[kind].toLowerCase()}`,
    lat: round(lat),
    lon: round(lon),
    kind,
    category: KIND_CATEGORY[kind],
    hours: hours || undefined,
    wifi: hasWifi(tags),
    power: hasPower(tags),
  };
}

export function parseOverpass(json: { elements?: OverpassElement[] }): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const el of json.elements ?? []) {
    const p = elementToPlace(el);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

// --- Cache (one hour, browser localStorage; live data only) ---

export const CACHE_KEY = "late-hague:places:v1";
export const CACHE_TTL_MS = 60 * 60 * 1000;

export type DataSource = "live" | "saved";

export interface PlacesResult {
  places: Place[];
  /** "live" = from an Overpass server (possibly cached up to an hour); "saved" = bundled snapshot. */
  source: DataSource;
  /** When live data was fetched (ms). For saved data: the snapshot date. */
  savedAt: number;
  fromCache: boolean;
  /** Snapshot date as YYYY-MM-DD, only for saved data. */
  snapshotDate?: string | undefined;
}

export function readCache(now: number = Date.now()): PlacesResult | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { savedAt: number; places: Place[] };
    if (!Array.isArray(data.places) || typeof data.savedAt !== "number") return null;
    if (now - data.savedAt > CACHE_TTL_MS || now < data.savedAt) return null;
    return { places: data.places, source: "live", savedAt: data.savedAt, fromCache: true };
  } catch {
    return null;
  }
}

export function writeCache(places: Place[], savedAt: number = Date.now()) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt, places }));
  } catch {
    // Storage full or blocked: the app still works without the cache.
  }
}

export function clearCache() {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export class OverpassError extends Error {
  kind: "busy" | "timeout" | "network" | "bad";
  constructor(kind: OverpassError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

// --- Live data: try each Overpass server in turn ---

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;
export const OVERPASS_URL = OVERPASS_ENDPOINTS[0];
export const ENDPOINT_TIMEOUT_MS = 20_000;

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchFromEndpoint(
  url: string,
  { fetchImpl = fetch, timeoutMs = ENDPOINT_TIMEOUT_MS }: { fetchImpl?: FetchFn; timeoutMs?: number } = {},
): Promise<Place[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(OVERPASS_QUERY),
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        throw new OverpassError("timeout", "OpenStreetMap took too long to answer.");
      }
      throw new OverpassError("network", "Could not reach OpenStreetMap.");
    }
    if (res.status === 429 || res.status === 503) {
      throw new OverpassError("busy", "The OpenStreetMap server is busy.");
    }
    if (res.status === 504) throw new OverpassError("timeout", "OpenStreetMap took too long to answer.");
    if (!res.ok) throw new OverpassError("bad", `OpenStreetMap returned an error (${res.status}).`);

    let json: { elements?: OverpassElement[]; remark?: string };
    try {
      json = await res.json();
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        throw new OverpassError("timeout", "OpenStreetMap took too long to answer.");
      }
      throw new OverpassError("bad", "The answer from OpenStreetMap could not be read.");
    }
    const places = parseOverpass(json);
    if (places.length === 0) {
      throw new OverpassError("bad", "OpenStreetMap could not finish the search.");
    }
    return places;
  } finally {
    clearTimeout(timer);
  }
}

// --- Saved data: bundled snapshot used when every live server fails ---

const SNAPSHOT_KIND: Record<string, PlaceKind> = {
  library: "library",
  coworking_space: "coworking",
  coworking: "coworking",
  cafe: "cafe",
  fast_food: "fast_food",
  restaurant: "restaurant",
  supermarket: "supermarket",
  convenience: "convenience",
};

export interface SnapshotPlace {
  id: string;
  name: string;
  kind: string;
  group?: string;
  lat: number;
  lon: number;
  opening_hours?: string | null;
  internet_access?: string | null;
  power_supply?: string | null;
  socket?: string | null;
}

export interface Snapshot {
  fetched: string;
  source?: string;
  places: SnapshotPlace[];
}

/** Converts the snapshot to places. Only the same kinds as the live search are kept. */
export function parseSnapshot(snapshot: Snapshot): Place[] {
  const out: Place[] = [];
  for (const s of snapshot.places) {
    const kind = SNAPSHOT_KIND[s.kind];
    if (!kind || typeof s.lat !== "number" || typeof s.lon !== "number") continue;
    const tags: Tags = {};
    if (s.internet_access) tags.internet_access = s.internet_access;
    if (s.power_supply) tags.power_supply = s.power_supply;
    if (s.socket) tags["socket"] = s.socket;
    const hours = s.opening_hours?.trim();
    out.push({
      id: s.id,
      name: s.name?.trim() || `Unnamed ${KIND_LABEL[kind].toLowerCase()}`,
      lat: s.lat,
      lon: s.lon,
      kind,
      category: KIND_CATEGORY[kind],
      hours: hours || undefined,
      wifi: hasWifi(tags),
      power: hasPower(tags),
    });
  }
  return out;
}

export async function loadSnapshot(): Promise<PlacesResult> {
  const mod = (await import("@/data/places_snapshot.json")) as unknown as { default: Snapshot };
  const snapshot = mod.default;
  return {
    places: parseSnapshot(snapshot),
    source: "saved",
    savedAt: Date.parse(`${snapshot.fetched}T00:00:00Z`),
    fromCache: false,
    snapshotDate: snapshot.fetched,
  };
}

/** "2026-11-05" -> "5 Nov 2026" */
export function formatSnapshotDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Cache (live, < 1 hour) → each Overpass server with a 20 s timeout → bundled saved snapshot.
 * Only live results are cached, so the next visit tries the live servers again.
 */
export async function fetchPlaces(
  options: { fetchImpl?: FetchFn; timeoutMs?: number; loadSaved?: () => Promise<PlacesResult> } = {},
): Promise<PlacesResult> {
  const cached = readCache();
  if (cached) return cached;

  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const places = await fetchFromEndpoint(url, options);
      const savedAt = Date.now();
      writeCache(places, savedAt);
      return { places, source: "live", savedAt, fromCache: false };
    } catch {
      // Try the next server.
    }
  }

  try {
    return await (options.loadSaved ?? loadSnapshot)();
  } catch {
    throw new OverpassError(
      "network",
      "Live data is unavailable and the saved data could not be opened. Check your internet connection and try again.",
    );
  }
}

// --- Helpers ---

export interface LatLon {
  lat: number;
  lon: number;
}

export function distanceMeters(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function directionsUrl(p: LatLon): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
}

export function osmObjectUrl(id: string): string {
  return `https://www.openstreetmap.org/${id}`;
}
