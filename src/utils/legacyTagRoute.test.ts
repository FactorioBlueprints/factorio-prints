import { describe, expect, it } from "vite-plus/test";
import { legacyTagRedirectParams } from "./legacyTagRoute";

describe("legacyTagRedirectParams", () => {
  it("splits a legacy tag into the category and name of the tagged route", () => {
    expect(
      ["belt/balancer", "/belt/balancer/", "train/4-way/junction"].map(legacyTagRedirectParams),
    ).toStrictEqual([
      { category: "belt", name: "balancer" },
      { category: "belt", name: "balancer" },
      { category: "train", name: "4-way/junction" },
    ]);
  });

  it("returns undefined when the tag has no category and name", () => {
    expect(["", "/", "belt", "/belt/", "belt/"].map(legacyTagRedirectParams)).toStrictEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});
