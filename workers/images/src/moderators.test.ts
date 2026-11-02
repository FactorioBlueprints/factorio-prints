import { describe, expect, it, vi } from "vitest";
import { createModeratorCheck } from "./moderators.ts";

const databaseUrl = "https://facorio-blueprints.firebaseio.com";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("createModeratorCheck", () => {
  it("reads the user's entry under /moderators", async () => {
    const fetch = vi.fn(async (_url: string) => json(200, true));

    const isModerator = await createModeratorCheck(fetch, databaseUrl)("user/id");

    expect(isModerator).toBe(true);
    expect(fetch).toHaveBeenCalledWith(`${databaseUrl}/moderators/user%2Fid.json`);
  });

  it("treats a missing entry as not a moderator", async () => {
    const isModerator = await createModeratorCheck(
      async () => json(200, null),
      databaseUrl,
    )("user");

    expect(isModerator).toBe(false);
  });

  it("treats any value other than true as not a moderator", async () => {
    const isModerator = await createModeratorCheck(
      async () => json(200, false),
      databaseUrl,
    )("user");

    expect(isModerator).toBe(false);
  });

  it("throws when Firebase does not answer", async () => {
    const check = createModeratorCheck(async () => json(503, null), databaseUrl);

    await expect(check("user")).rejects.toThrow("Firebase returned 503");
  });
});
