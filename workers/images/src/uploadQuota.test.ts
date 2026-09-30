import { describe, expect, it } from "vitest";
import { consumeHourlyQuota, type QuotaStorage } from "./uploadQuota.ts";

const createStorage = (): QuotaStorage & { values: Map<string, unknown> } => {
  const values = new Map<string, unknown>();
  return {
    values,
    get: async <T>(key: string) => values.get(key) as T | undefined,
    put: async (key: string, value: unknown) => {
      values.set(key, value);
    },
  };
};

const at = (iso: string) => () => Date.parse(iso);

describe("consumeHourlyQuota", () => {
  it("allows uploads up to the limit within one UTC hour", async () => {
    const storage = createStorage();
    const results = [];
    for (let index = 0; index < 4; index += 1) {
      results.push(await consumeHourlyQuota(storage, at("2026-10-01T10:15:00Z"), 3));
    }

    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results.at(-1)).toEqual({ allowed: false, count: 3, limit: 3 });
  });

  it("starts counting again in the next hour", async () => {
    const storage = createStorage();
    await consumeHourlyQuota(storage, at("2026-10-01T10:59:00Z"), 1);

    const nextHour = await consumeHourlyQuota(storage, at("2026-10-01T11:01:00Z"), 1);

    expect(nextHour).toEqual({ allowed: true, count: 1, limit: 1 });
  });
});
