import { describe, expect, it } from "vite-plus/test";
import { sha1Hex } from "./sha1";

describe("sha1Hex", () => {
  it("hashes a known string the way the blueprint API keys blueprint strings", async () => {
    await expect(sha1Hex("abc")).resolves.toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("hashes the empty string", async () => {
    await expect(sha1Hex("")).resolves.toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
  });

  it("hashes non-ascii as utf-8", async () => {
    await expect(sha1Hex("héllo")).resolves.toBe("35b5ea45c5e41f78b46a937cc74d41dfea920890");
  });
});
