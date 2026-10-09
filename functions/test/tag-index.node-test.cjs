const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  createTagIndexAdditions,
  createTagIndexRemovals,
  createTagIndexUpdate,
  readBlueprintTags,
  readTagList,
} = require("../lib/tag-index.js");

describe("tag index helpers", () => {
  it("reads tag lists from blueprint data and tag snapshots", () => {
    assert.deepStrictEqual(readBlueprintTags({ tags: ["category/alpha", "category/beta"] }), [
      "category/alpha",
      "category/beta",
    ]);
    assert.deepStrictEqual(readBlueprintTags({}), []);
    assert.deepStrictEqual(readTagList(null), []);
  });

  it("rejects malformed blueprint data and tags", () => {
    assert.throws(() => readBlueprintTags(null), {
      name: "TypeError",
      message: "Blueprint data must be an object.",
    });
    assert.throws(() => readTagList(["category/alpha", 100]), {
      name: "TypeError",
      message: "Blueprint tags must be an array of strings.",
    });
  });

  it("creates exact additions and removals", () => {
    assert.deepStrictEqual(
      createTagIndexAdditions("blueprint-100", ["category/alpha", "category/beta"]),
      {
        "/byTag/category/alpha/blueprint-100": true,
        "/byTag/category/beta/blueprint-100": true,
      },
    );
    assert.deepStrictEqual(createTagIndexRemovals("blueprint-100", ["category/alpha"]), {
      "/byTag/category/alpha/blueprint-100": null,
    });
  });

  it("updates only changed tag memberships", () => {
    assert.deepStrictEqual(
      createTagIndexUpdate(
        "blueprint-100",
        ["category/alpha", "category/shared"],
        ["category/shared", "category/beta"],
      ),
      {
        "/byTag/category/beta/blueprint-100": true,
        "/byTag/category/alpha/blueprint-100": null,
      },
    );
  });
});
