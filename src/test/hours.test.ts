import { describe, expect, it } from "vitest";
import { classify, hhsLibraryStatus, presetWhen, whenToDate, amsterdamNow, type AmsterdamClock } from "@/lib/hours";

// Thursday 5 November 2026, 15:39 in Amsterdam
const THU: AmsterdamClock = { year: 2026, month: 11, dayOfMonth: 5, weekday: 3, hour: 15, minute: 39 };

describe("opening hours classification", () => {
  it("is open inside the listed hours", () => {
    const d = whenToDate({ day: 0, time: "10:00" }, THU); // Monday
    expect(classify("Mo-Fr 09:00-17:00", d).status).toBe("open");
  });

  it("is closed outside the listed hours", () => {
    const d = whenToDate({ day: 5, time: "14:00" }, THU); // Saturday
    expect(classify("Mo-Fr 09:00-17:00", d).status).toBe("closed");
  });

  it("handles hours past midnight", () => {
    const d = whenToDate({ day: 4, time: "00:30" }, THU); // Friday 00:30, Thursday's late shift
    expect(classify("Th 18:00-01:00", d).status).toBe("open");
  });

  it("never treats a missing opening_hours tag as open", () => {
    const d = whenToDate({ day: 0, time: "12:00" }, THU);
    expect(classify(undefined, d)).toEqual({ status: "unknown", reason: "missing" });
    expect(classify("  ", d)).toEqual({ status: "unknown", reason: "missing" });
  });

  it("treats unreadable hours as unknown, not open", () => {
    const d = whenToDate({ day: 0, time: "12:00" }, THU);
    expect(classify("garbage xx", d)).toEqual({ status: "unknown", reason: "unreadable" });
  });

  it("treats hours marked unknown as unknown", () => {
    const d = whenToDate({ day: 0, time: "12:00" }, THU);
    expect(classify("Mo-Fr 10:00-20:00 unknown", d).status).toBe("unknown");
  });
});

describe("day and time picker", () => {
  it("maps a weekday to the next occurrence, today included", () => {
    expect(whenToDate({ day: 3, time: "23:00" }, THU)).toEqual(new Date(2026, 10, 5, 23, 0));
    expect(whenToDate({ day: 4, time: "20:00" }, THU)).toEqual(new Date(2026, 10, 6, 20, 0));
    expect(whenToDate({ day: 2, time: "09:00" }, THU)).toEqual(new Date(2026, 10, 11, 9, 0));
  });

  it("quick buttons give Now, Tonight 23:00, Friday 20:00, Saturday 14:00", () => {
    expect(presetWhen("now", THU)).toMatchObject({ day: 3, time: "15:39" });
    expect(presetWhen("tonight", THU)).toMatchObject({ day: 3, time: "23:00" });
    expect(presetWhen("friday", THU)).toMatchObject({ day: 4, time: "20:00" });
    expect(presetWhen("saturday", THU)).toMatchObject({ day: 5, time: "14:00" });
  });

  it("reads the current time in Europe/Amsterdam", () => {
    // 2026-11-05T22:30:00Z is 23:30 in Amsterdam (CET, UTC+1)
    const c = amsterdamNow(new Date("2026-11-05T22:30:00Z"));
    expect(c).toMatchObject({ weekday: 3, hour: 23, minute: 30, dayOfMonth: 5 });
  });
});

describe("Haagse Hogeschool library", () => {
  const at = (day: number, time: string) => hhsLibraryStatus({ day, time }, whenToDate({ day, time }, THU));
  it("is open Monday to Thursday until 22:30", () => {
    expect(at(0, "22:00")).toBe("open");
    expect(at(3, "22:45")).toBe("closed");
  });
  it("closes at 18:00 on Friday", () => {
    expect(at(4, "17:30")).toBe("open");
    expect(at(4, "20:00")).toBe("closed");
  });
  it("has no weekend hours listed", () => {
    expect(at(5, "14:00")).toBe("not-listed");
    expect(at(6, "14:00")).toBe("not-listed");
  });
});
