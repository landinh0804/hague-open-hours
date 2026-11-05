import { beforeEach, describe, expect, it } from "vitest";
import {
  CACHE_KEY,
  OVERPASS_ENDPOINTS,
  fetchPlaces,
  formatSnapshotDate,
  loadSnapshot,
  parseSnapshot,
  readCache,
} from "@/lib/places";
import { classify } from "@/lib/hours";

const okBody = {
  elements: [{ type: "node", id: 1, lat: 52.07, lon: 4.3, tags: { amenity: "cafe", name: "Live Café" } }],
};
const ok = () => new Response(JSON.stringify(okBody), { status: 200 });
const status = (code: number) => new Response("busy", { status: code });
/** Never answers; rejects only when the request is aborted by the timeout. */
const hang = (_url: string, init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  });

describe("Overpass fallback", () => {
  beforeEach(() => localStorage.clear());

  it("tries the three servers in the given order", () => {
    expect(OVERPASS_ENDPOINTS).toEqual([
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ]);
  });

  it("moves on after a 503 and after a timeout, and uses the first server that works", async () => {
    const calls: string[] = [];
    const responses = [() => Promise.resolve(status(503)), hang, () => Promise.resolve(ok())];
    const result = await fetchPlaces({
      timeoutMs: 30,
      fetchImpl: (url, init) => {
        calls.push(url);
        return responses[calls.length - 1]!(url, init);
      },
    });
    expect(calls).toEqual([...OVERPASS_ENDPOINTS]);
    expect(result.source).toBe("live");
    expect(result.places[0]?.name).toBe("Live Café");
    expect(readCache()?.places).toHaveLength(1);
  });

  it("uses saved data when every server fails, and does not cache it", async () => {
    const result = await fetchPlaces({ timeoutMs: 30, fetchImpl: () => Promise.resolve(status(503)) });
    expect(result.source).toBe("saved");
    expect(result.snapshotDate).toBe("2026-11-05");
    expect(result.places.length).toBeGreaterThan(1900);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("shows the saved date as 5 Nov 2026", () => {
    expect(formatSnapshotDate("2026-11-05")).toBe("5 Nov 2026");
  });
});

describe("saved snapshot", () => {
  it("keeps only the same kinds of places as the live search", async () => {
    const { places } = await loadSnapshot();
    expect(places.every((p) => ["library", "coworking", "cafe", "fast_food", "restaurant", "supermarket", "convenience"].includes(p.kind))).toBe(true);
    expect(places).toHaveLength(2016 - 28); // colleges and universities left out
  });

  it("never counts saved places without hours as open", async () => {
    const { places } = await loadSnapshot();
    const noHours = places.filter((p) => !p.hours);
    expect(noHours.length).toBeGreaterThan(0);
    const date = new Date(2026, 10, 6, 20, 0);
    expect(noHours.every((p) => classify(p.hours, date).status === "unknown")).toBe(true);
  });

  it("reads Wi-Fi and power badges only from the snapshot fields", () => {
    const [a, b, c] = parseSnapshot({
      fetched: "2026-11-05",
      places: [
        { id: "node/1", name: "A", kind: "cafe", lat: 52, lon: 4, internet_access: "wlan", power_supply: null },
        { id: "node/2", name: "B", kind: "cafe", lat: 52, lon: 4, internet_access: "no", socket: "yes" },
        { id: "node/3", name: "C", kind: "cafe", lat: 52, lon: 4 },
      ],
    });
    expect([a?.wifi, a?.power]).toEqual([true, false]);
    expect([b?.wifi, b?.power]).toEqual([false, true]);
    expect([c?.wifi, c?.power]).toEqual([false, false]);
  });
});
