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

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export const OVERPASS_QUERY = `[out:json][timeout:90];
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

// --- Cache (one hour, browser localStorage) ---

export const CACHE_KEY = "late-hague:places:v1";
export const CACHE_TTL_MS = 60 * 60 * 1000;

export interface PlacesResult {
  places: Place[];
  savedAt: number;
  fromCache: boolean;
}

export function readCache(now: number = Date.now()): PlacesResult | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { savedAt: number; places: Place[] };
    if (!Array.isArray(data.places) || typeof data.savedAt !== "number") return null;
    if (now - data.savedAt > CACHE_TTL_MS || now < data.savedAt) return null;
    return { places: data.places, savedAt: data.savedAt, fromCache: true };
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

export async function fetchPlaces(): Promise<PlacesResult> {
  const cached = readCache();
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 100_000);
  let res: Response;
  try {
    res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(OVERPASS_QUERY),
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new OverpassError("timeout", "OpenStreetMap took too long to answer.");
    }
    throw new OverpassError("network", "Could not reach OpenStreetMap. Check your internet connection.");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    throw new OverpassError("busy", "The OpenStreetMap server is busy right now. Wait a minute and try again.");
  }
  if (res.status === 504) {
    throw new OverpassError("timeout", "OpenStreetMap took too long to answer.");
  }
  if (!res.ok) {
    throw new OverpassError("bad", `OpenStreetMap returned an error (${res.status}).`);
  }

  let json: { elements?: OverpassElement[]; remark?: string };
  try {
    json = await res.json();
  } catch {
    throw new OverpassError("bad", "The answer from OpenStreetMap could not be read.");
  }
  const places = parseOverpass(json);
  if (places.length === 0 && json.remark) {
    throw new OverpassError("timeout", "OpenStreetMap could not finish the search. Try again.");
  }
  const savedAt = Date.now();
  writeCache(places, savedAt);
  return { places, savedAt, fromCache: false };
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
