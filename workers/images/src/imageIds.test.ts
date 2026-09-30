import { describe, expect, it } from "vitest";
import { fallbackIdLength, isFallbackImageId, newFallbackImageId } from "./imageIds.ts";

describe("fallback image ids", () => {
  it("are 20 letters and digits, so the gateway path and R2 key accept them", () => {
    const id = newFallbackImageId();

    expect(id).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(fallbackIdLength).toBe(20);
  });

  it("differ from one another", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newFallbackImageId()));

    expect(ids.size).toBe(1000);
  });

  it("are told apart from Imgur ids, which are 5 to 7 characters, by length alone", () => {
    expect(isFallbackImageId(newFallbackImageId())).toBe(true);
    expect(isFallbackImageId("AbCdE12")).toBe(false);
    expect(isFallbackImageId("AbCdE")).toBe(false);
    expect(isFallbackImageId("0J0472qb")).toBe(false);
  });
});
