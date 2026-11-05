import { beforeEach, describe, expect, it } from "vitest";
import {
  CACHE_KEY,
  CACHE_TTL_MS,
  directionsUrl,
  elementToPlace,
  hasPower,
  hasWifi,
  readCache,
  writeCache,
} from "@/lib/places";

describe("study badges come only from tags", () => {
  it("shows Wi-Fi only for internet_access=wlan or yes", () => {
    expect(hasWifi({ internet_access: "wlan" })).toBe(true);
    expect(hasWifi({ internet_access: "yes" })).toBe(true);
    expect(hasWifi({ internet_access: "no" })).toBe(false);
    expect(hasWifi({ internet_access: "wired" })).toBe(false);
    expect(hasWifi({})).toBe(false);
  });

  it("shows power sockets only for power_supply or socket tags", () => {
    expect(hasPower({ power_supply: "yes" })).toBe(true);
    expect(hasPower({ "socket:schuko": "4" })).toBe(true);
    expect(hasPower({ power_supply: "no" })).toBe(false);
    expect(hasPower({ amenity: "cafe" })).toBe(false);
  });
});

describe("place categories", () => {
  it("puts libraries, cafés and coworking under Study", () => {
    for (const tags of [{ amenity: "library" }, { amenity: "cafe" }, { amenity: "coworking_space" }, { office: "coworking" }]) {
      expect(elementToPlace({ type: "node", id: 1, lat: 52, lon: 4, tags })?.category).toBe("study");
    }
  });
  it("puts fast food, restaurants, supermarkets and convenience shops under Food", () => {
    for (const tags of [{ amenity: "fast_food" }, { amenity: "restaurant" }, { shop: "supermarket" }, { shop: "convenience" }]) {
      expect(elementToPlace({ type: "way", id: 2, center: { lat: 52, lon: 4 }, tags })?.category).toBe("food");
    }
  });
});

it("builds a plain Google Maps directions link", () => {
  expect(directionsUrl({ lat: 52.07, lon: 4.3 })).toBe("https://www.google.com/maps/dir/?api=1&destination=52.07,4.3");
});

describe("one-hour cache", () => {
  beforeEach(() => localStorage.clear());
  const place = elementToPlace({ type: "node", id: 9, lat: 52, lon: 4, tags: { amenity: "cafe" } })!;

  it("returns cached places within one hour", () => {
    writeCache([place], 1_000_000);
    expect(readCache(1_000_000 + CACHE_TTL_MS - 1)?.places).toHaveLength(1);
  });
  it("expires after one hour", () => {
    writeCache([place], 1_000_000);
    expect(readCache(1_000_000 + CACHE_TTL_MS + 1)).toBeNull();
  });
  it("never stores a location", () => {
    writeCache([place], 1_000_000);
    expect(Object.keys(localStorage)).toEqual([CACHE_KEY]);
  });
});
