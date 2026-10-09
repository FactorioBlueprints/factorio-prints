import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, set, update } from "firebase/database";

const projectId = "factorio-blueprints-rules-test";
const blueprintId = "blueprint-100";
const ownerId = "owner-100";
const moderatorId = "moderator-100";
const userId = "user-100";

let testEnvironment;

before(async () => {
  const rules = await readFile(new URL("../database.rules.json", import.meta.url), "utf8");
  testEnvironment = await initializeTestEnvironment({
    projectId,
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules,
    },
  });
});

after(async () => {
  await testEnvironment.cleanup();
});

beforeEach(async () => {
  await testEnvironment.clearDatabase();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database()), {
      blueprints: {
        [blueprintId]: {
          author: {
            displayName: "Owner 100",
            userId: ownerId,
          },
          favorites: {
            "fan-100": true,
            "fan-200": true,
          },
          numberOfFavorites: 2,
          title: "Original blueprint",
        },
      },
      blueprintSummaries: {
        [blueprintId]: {
          numberOfFavorites: 2,
          title: "Original summary",
        },
      },
      blueprintsPrivate: {
        [blueprintId]: {
          imageUrl: "https://i.imgur.com/image100.png",
        },
      },
      moderators: {
        [moderatorId]: true,
      },
      byTag: {
        category1: {
          tag1: {
            [blueprintId]: true,
          },
        },
      },
      tags: {
        "tag-100": "/category1/tag1/",
      },
    });
  });
});

describe("numberOfFavorites rules", () => {
  test("reject a direct count write from an authenticated user", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(set(ref(database, `blueprints/${blueprintId}/numberOfFavorites`), 3));
  });

  test("reject a blueprint count change through an owner's parent write grant", async () => {
    const database = testEnvironment.authenticatedContext(ownerId).database();

    await assertFails(
      update(ref(database, `blueprints/${blueprintId}`), {
        numberOfFavorites: 3,
        title: "Tampered blueprint",
      }),
    );
  });

  test("reject a summary count change through a moderator's parent write grant", async () => {
    const database = testEnvironment.authenticatedContext(moderatorId).database();

    await assertFails(
      update(ref(database, `blueprintSummaries/${blueprintId}`), {
        numberOfFavorites: 3,
        title: "Tampered summary",
      }),
    );
  });

  test("allow an owner to update other blueprint fields", async () => {
    const database = testEnvironment.authenticatedContext(ownerId).database();

    await assertSucceeds(
      update(ref(database, `blueprints/${blueprintId}`), {
        title: "Updated blueprint",
      }),
    );

    const snapshot = await get(ref(database, `blueprints/${blueprintId}`));
    assert.deepStrictEqual(snapshot.val(), {
      author: {
        displayName: "Owner 100",
        userId: ownerId,
      },
      favorites: {
        "fan-100": true,
        "fan-200": true,
      },
      numberOfFavorites: 2,
      title: "Updated blueprint",
    });
  });

  test("allow a moderator to update other summary fields", async () => {
    const database = testEnvironment.authenticatedContext(moderatorId).database();

    await assertSucceeds(
      update(ref(database, `blueprintSummaries/${blueprintId}`), {
        title: "Updated summary",
      }),
    );

    const snapshot = await get(ref(database, `blueprintSummaries/${blueprintId}`));
    assert.deepStrictEqual(snapshot.val(), {
      numberOfFavorites: 2,
      title: "Updated summary",
    });
  });

  test("allow only zero as an initial blueprint count", async () => {
    const database = testEnvironment.authenticatedContext(ownerId).database();
    const invalidBlueprint = {
      author: {
        userId: ownerId,
      },
      numberOfFavorites: 1,
      title: "New blueprint",
    };

    await assertFails(set(ref(database, "blueprints/blueprint-200"), invalidBlueprint));
    await assertSucceeds(
      set(ref(database, "blueprints/blueprint-200"), {
        ...invalidBlueprint,
        numberOfFavorites: 0,
      }),
    );
  });
});

describe("blueprintsPrivate access rules", () => {
  test("reject a read from an unauthenticated visitor", async () => {
    const database = testEnvironment.unauthenticatedContext().database();

    await assertFails(get(ref(database, `blueprintsPrivate/${blueprintId}`)));
  });

  test("reject a read from an unrelated authenticated user", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(get(ref(database, `blueprintsPrivate/${blueprintId}`)));
  });

  test("allow a read from the blueprint owner", async () => {
    const database = testEnvironment.authenticatedContext(ownerId).database();

    const snapshot = await assertSucceeds(get(ref(database, `blueprintsPrivate/${blueprintId}`)));
    assert.deepStrictEqual(snapshot.val(), {
      imageUrl: "https://i.imgur.com/image100.png",
    });
  });

  test("allow a read from a moderator", async () => {
    const database = testEnvironment.authenticatedContext(moderatorId).database();

    const snapshot = await assertSucceeds(get(ref(database, `blueprintsPrivate/${blueprintId}`)));
    assert.deepStrictEqual(snapshot.val(), {
      imageUrl: "https://i.imgur.com/image100.png",
    });
  });

  test("reject a write from an unrelated authenticated user", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(
      set(
        ref(database, `blueprintsPrivate/${blueprintId}/imageUrl`),
        "https://i.imgur.com/evil.png",
      ),
    );
  });
});

describe("moderators list rules", () => {
  test("reject a user promoting themselves to moderator", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(set(ref(database, `moderators/${userId}`), true));
  });

  test("reject a moderator promoting another user", async () => {
    const database = testEnvironment.authenticatedContext(moderatorId).database();

    await assertFails(set(ref(database, `moderators/${userId}`), true));
  });
});

describe("blueprint creation rules", () => {
  const newBlueprint = {
    author: {
      displayName: "User 100",
      userId,
    },
    blueprintString: "0eNq-new-blueprint",
    numberOfFavorites: 0,
    title: "New blueprint",
  };

  test("reject a create from an unauthenticated visitor", async () => {
    const database = testEnvironment.unauthenticatedContext().database();

    await assertFails(set(ref(database, "blueprints/blueprint-200"), newBlueprint));
  });

  test("reject a create that claims another user's authorship", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(
      set(ref(database, "blueprints/blueprint-200"), {
        ...newBlueprint,
        author: {
          displayName: "Owner 100",
          userId: ownerId,
        },
      }),
    );
  });

  test("allow a create that claims the authenticated user's own authorship", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertSucceeds(set(ref(database, "blueprints/blueprint-200"), newBlueprint));
  });
});

describe("blueprint collector index rules", () => {
  test("allow a user to add and remove their own collector entry on an existing blueprint", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();
    const collectorRef = ref(database, `blueprintCollectors/${blueprintId}/${userId}`);

    await assertSucceeds(set(collectorRef, true));
    await assertSucceeds(set(collectorRef, null));
  });

  test("reject a user writing another user's collector entry", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(set(ref(database, `blueprintCollectors/${blueprintId}/${ownerId}`), true));
  });

  test("reject a collector entry that would create a phantom blueprint", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(
      set(ref(database, `blueprintCollectors/deleted-blueprint-100/${userId}`), true),
    );
  });

  test("reject a client read of collector membership", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(get(ref(database, `blueprintCollectors/${blueprintId}`)));
  });
});

describe("tags registry rules", () => {
  test("reject a write from an authenticated non-moderator", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(set(ref(database, "tags/tag-200"), "/category1/tag2/"));
  });

  test("reject a write from a moderator, since the registry is curated out of band", async () => {
    const database = testEnvironment.authenticatedContext(moderatorId).database();

    await assertFails(set(ref(database, "tags/tag-200"), "/category1/tag2/"));
  });
});

describe("byTag index rules", () => {
  test("reject a write from an unauthenticated visitor", async () => {
    const database = testEnvironment.unauthenticatedContext().database();

    await assertFails(set(ref(database, `byTag/category1/tag2/${blueprintId}`), true));
  });

  test("reject a write from a user who does not own the blueprint", async () => {
    const database = testEnvironment.authenticatedContext(userId).database();

    await assertFails(set(ref(database, `byTag/category1/tag2/${blueprintId}`), true));
  });

  test("reject a write at the two-segment depth a single-key tag id would produce", async () => {
    const database = testEnvironment.authenticatedContext(ownerId).database();

    await assertFails(set(ref(database, `byTag/category1/${blueprintId}`), true));
  });

  test("allow the blueprint owner to add a tag entry", async () => {
    const database = testEnvironment.authenticatedContext(ownerId).database();

    await assertSucceeds(set(ref(database, `byTag/category1/tag2/${blueprintId}`), true));
  });

  test("allow the blueprint owner to remove a tag entry", async () => {
    const database = testEnvironment.authenticatedContext(ownerId).database();

    await assertSucceeds(set(ref(database, `byTag/category1/tag1/${blueprintId}`), null));
  });

  test("allow a moderator to remove a tag entry", async () => {
    const database = testEnvironment.authenticatedContext(moderatorId).database();

    await assertSucceeds(set(ref(database, `byTag/category1/tag1/${blueprintId}`), null));
  });

  test("allow the owner to retag through the multi-path update the edit flow issues", async () => {
    const database = testEnvironment.authenticatedContext(ownerId).database();

    await assertSucceeds(
      update(ref(database), {
        [`/byTag/category1/tag1/${blueprintId}`]: null,
        [`/byTag/category2/tag3/${blueprintId}`]: true,
      }),
    );
  });
});
