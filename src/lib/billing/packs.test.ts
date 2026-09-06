import { describe, expect, it } from "vitest";
import { CREDIT_PACKS, findCreditPack } from "./packs";

describe("findCreditPack", () => {
  it("finds a pack by id", () => {
    expect(findCreditPack("starter")).toEqual(CREDIT_PACKS[0]);
  });

  it("returns undefined for an unknown id", () => {
    expect(findCreditPack("nonexistent")).toBeUndefined();
  });
});
