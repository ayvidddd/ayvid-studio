import { describe, expect, it, vi, afterEach } from "vitest";
import { INITIAL_POLL_DELAY_MS, nextPollDelayMs } from "./poll";

describe("nextPollDelayMs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("scales by 1.5x plus jitter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(nextPollDelayMs(INITIAL_POLL_DELAY_MS)).toBe(3000);
    expect(nextPollDelayMs(3000)).toBe(4500);
  });

  it("caps at 10s even with jitter added on top", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const delay = nextPollDelayMs(9000);
    expect(delay).toBe(10_500); // capped scaled value (10000) + full jitter (500)
  });

  it("never scales below the 10s cap once already at the cap", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(nextPollDelayMs(10_000)).toBe(10_000);
  });
});
