// Bounds how many images one user can upload per UTC hour. Every upload spends the one
// FactorioBlueprints account's Imgur API allowance, so one user must not be able to exhaust it for
// everyone. One Durable Object per user holds that user's count.

const quotaStorageKey = "hourly-upload-count";

export interface QuotaStorage {
  readonly get: <T>(key: string) => Promise<T | undefined>;
  readonly put: (key: string, value: unknown) => Promise<void>;
}

interface HourlyCount {
  readonly count: number;
  readonly hour: string;
}

export interface QuotaDecision {
  readonly allowed: boolean;
  readonly count: number;
  readonly limit: number;
}

export const consumeHourlyQuota = async (
  storage: QuotaStorage,
  now: () => number,
  limit: number,
): Promise<QuotaDecision> => {
  const hour = new Date(now()).toISOString().slice(0, 13);
  const stored = await storage.get<HourlyCount>(quotaStorageKey);
  const count = stored?.hour === hour ? stored.count : 0;
  if (count >= limit) return { allowed: false, count, limit };

  await storage.put(quotaStorageKey, { count: count + 1, hour });
  return { allowed: true, count: count + 1, limit };
};

export class UploadQuota implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly environment: Env,
  ) {}

  async fetch(): Promise<Response> {
    const limit = Number(this.environment.UPLOAD_HOURLY_LIMIT);
    const decision = await consumeHourlyQuota(this.state.storage, () => Date.now(), limit);
    return Response.json(decision);
  }
}

export const consumeThroughUploadQuota = async (
  namespace: DurableObjectNamespace,
  userId: string,
): Promise<boolean> => {
  const stub = namespace.get(namespace.idFromName(userId));
  const decision = (await (
    await stub.fetch("https://upload-quota/consume", { method: "POST" })
  ).json()) as QuotaDecision;
  return decision.allowed;
};
