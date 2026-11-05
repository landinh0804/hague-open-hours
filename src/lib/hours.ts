import OpeningHours from "opening_hours";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Day is 0 = Monday … 6 = Sunday. Time is "HH:MM" wall-clock time in Europe/Amsterdam. */
export interface When {
  day: number;
  time: string;
  preset?: PresetId;
}

export type PresetId = "now" | "tonight" | "friday" | "saturday";

export interface AmsterdamClock {
  year: number;
  month: number;
  dayOfMonth: number;
  weekday: number;
  hour: number;
  minute: number;
}

/** Current wall-clock time in Europe/Amsterdam, independent of the device's time zone. */
export function amsterdamNow(date: Date = new Date()): AmsterdamClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    dayOfMonth: Number(get("day")),
    weekday: DAYS_SHORT.indexOf(get("weekday") as (typeof DAYS_SHORT)[number]),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function presetWhen(id: PresetId, now: AmsterdamClock = amsterdamNow()): When {
  switch (id) {
    case "now":
      return { day: now.weekday, time: `${pad(now.hour)}:${pad(now.minute)}`, preset: id };
    case "tonight":
      return { day: now.weekday, time: "23:00", preset: id };
    case "friday":
      return { day: 4, time: "20:00", preset: id };
    case "saturday":
      return { day: 5, time: "14:00", preset: id };
  }
}

/**
 * Builds a Date whose *local* fields equal the chosen Amsterdam wall-clock time
 * on the next occurrence of that weekday (today counts). opening_hours reads
 * local fields, so this works whatever time zone the phone is set to.
 */
export function whenToDate(when: When, now: AmsterdamClock = amsterdamNow()): Date {
  const offset = (when.day - now.weekday + 7) % 7;
  const [h, m] = when.time.split(":").map(Number);
  return new Date(now.year, now.month - 1, now.dayOfMonth + offset, h || 0, m || 0, 0, 0);
}

export function formatWhen(when: When, now: AmsterdamClock = amsterdamNow()): string {
  const dayLabel = when.day === now.weekday ? `Today (${DAYS[when.day]})` : DAYS[when.day];
  return `${dayLabel}, ${when.time}`;
}

export type HoursStatus = "open" | "closed" | "unknown";
export type UnknownReason = "missing" | "unreadable" | "uncertain";
export interface HoursResult {
  status: HoursStatus;
  reason?: UnknownReason;
}

// Centre of Den Haag; country/state enable Dutch public holidays (PH) and sunrise/sunset.
const NOMINATIM = {
  lat: 52.0705,
  lon: 4.3007,
  address: { country_code: "nl", state: "Zuid-Holland" },
};

const parsed = new Map<string, OpeningHours | null>();

function parse(value: string): OpeningHours | null {
  if (parsed.has(value)) return parsed.get(value) ?? null;
  let oh: OpeningHours | null = null;
  try {
    oh = new OpeningHours(value, NOMINATIM, 0);
  } catch {
    oh = null;
  }
  parsed.set(value, oh);
  return oh;
}

/**
 * Decides whether a place is open at `date` from its OSM opening_hours tag.
 * A missing, unreadable or uncertain value is always "unknown" — never "open".
 */
export function classify(tag: string | null | undefined, date: Date): HoursResult {
  const value = tag?.trim();
  if (!value) return { status: "unknown", reason: "missing" };
  const oh = parse(value);
  if (!oh) return { status: "unknown", reason: "unreadable" };
  try {
    if (oh.getUnknown(date)) return { status: "unknown", reason: "uncertain" };
    return { status: oh.getState(date) ? "open" : "closed" };
  } catch {
    return { status: "unknown", reason: "unreadable" };
  }
}

export const UNKNOWN_REASON_LABEL: Record<UnknownReason, string> = {
  missing: "No opening hours in OpenStreetMap",
  unreadable: "Opening hours could not be read",
  uncertain: "Opening hours marked as uncertain",
};

/** Official Haagse Hogeschool library hours (weekends are not listed). */
export const HHS_LIBRARY = {
  hours: "Mo-Th 09:00-22:30; Fr 09:00-18:00",
  source:
    "https://www.dehaagsehogeschool.nl/over-de-haagse/faciliteiten/bibliotheek/over-de-bibliotheek/openingstijden-en-contactgegevens",
};

export type LibraryStatus = "open" | "closed" | "not-listed";

export function hhsLibraryStatus(when: When, date: Date): LibraryStatus {
  if (when.day >= 5) return "not-listed";
  const r = classify(HHS_LIBRARY.hours, date);
  return r.status === "open" ? "open" : "closed";
}
