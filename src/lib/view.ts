import type { HoursResult } from "./hours";
import type { Place } from "./places";

export interface PlaceView {
  place: Place;
  result: HoursResult;
  distance?: number | undefined;
}

export interface Selection {
  id: string;
  /** Changes on every click so the map re-centres even on the same place. */
  token: number;
  source: "list" | "map";
}
