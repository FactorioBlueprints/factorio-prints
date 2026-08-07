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
      moderators: {
        [moderatorId]: true,
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
