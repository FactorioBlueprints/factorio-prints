import { describe, expect, test } from "vitest";
import {
  buildCollectorBackfill,
  getCollectedBlueprintIds,
  getIndexedCollectorUserIds,
  getLegacyCollectorUserIds,
} from "../functions/src/collectorIndex";

const users = {
  alice: {
    collection: {
      "blueprint-100": true,
      "blueprint-200": false,
      "deleted-blueprint-100": true,
    },
  },
  bob: {
    collection: {
      "blueprint-100": true,
      "blueprint-200": true,
    },
  },
  charlie: {
    collection: null,
  },
};

describe("collector index", () => {
  test("collects unique blueprint IDs from active user collection entries", () => {
    expect(getCollectedBlueprintIds(users)).toStrictEqual(
      new Set(["blueprint-100", "deleted-blueprint-100", "blueprint-200"]),
    );
  });

  test("builds updates only for blueprints that still exist", () => {
    expect(
      buildCollectorBackfill(users, new Set(["blueprint-100", "blueprint-200"])),
    ).toStrictEqual({
      updates: {
        "/blueprintCollectors/blueprint-100/alice": true,
        "/blueprintCollectors/blueprint-100/bob": true,
        "/blueprintCollectors/blueprint-200/bob": true,
      },
      users: 2,
      entries: 3,
      skippedEntries: 1,
    });
  });

  test("reads only active users from a blueprint collector index", () => {
    expect(
      getIndexedCollectorUserIds({
        alice: true,
        bob: false,
        charlie: true,
      }),
    ).toStrictEqual(["alice", "charlie"]);
  });

  test("finds active legacy collection entries for one blueprint", () => {
    expect(getLegacyCollectorUserIds(users, "blueprint-100")).toStrictEqual(["alice", "bob"]);
  });
});
