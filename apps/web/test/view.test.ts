import { describe, expect, it } from "vitest";
import { confirmedDeadline, formatAmount } from "../lib/view.ts";

describe("exact browser presentation and conservative admission", () => {
  it("formats signed/zero/large integers without floating point", () => {
    expect(formatAmount("0")).toBe("0");
    expect(formatAmount(null)).toBe("Unavailable");
    expect(formatAmount("-1")).toBe("−0.000001");
    expect(formatAmount("123456789012345678901234567890")).toBe("123456789012345678901234.56789");
    expect(formatAmount("1", 18)).toBe("0.000000000000000001");
    expect(formatAmount("1e8")).toBe("Unavailable");
  });
  it("anchors expiry to request start and rejects already expired or invalid evidence", () => {
    expect(confirmedDeadline(100, 600, 5000)).toBe(5100);
    expect(confirmedDeadline(100, 6000, 5000)).toBe(0);
    expect(confirmedDeadline(100, 100, 0)).toBe(0);
    expect(confirmedDeadline(100, 100, NaN)).toBe(0);
  });
});
