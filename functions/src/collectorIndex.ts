type DataRecord = Record<string, unknown>;

export type CollectorBackfill = {
  updates: Record<string, true>;
  users: number;
  entries: number;
  skippedEntries: number;
};

const asRecord = (value: unknown): DataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as DataRecord) : {};

const getTrueKeys = (value: unknown): string[] =>
  Object.entries(asRecord(value))
    .filter(([, isPresent]) => isPresent === true)
    .map(([key]) => key);

export const getCollectedBlueprintIds = (users: unknown): Set<string> => {
  const blueprintIds = new Set<string>();

  for (const user of Object.values(asRecord(users))) {
    for (const blueprintId of getTrueKeys(asRecord(user).collection)) {
      blueprintIds.add(blueprintId);
    }
  }

  return blueprintIds;
};

export const buildCollectorBackfill = (
  users: unknown,
  existingBlueprintIds: ReadonlySet<string>,
): CollectorBackfill => {
  const updates: Record<string, true> = {};
  const backfilledUserIds = new Set<string>();
  let entries = 0;
  let skippedEntries = 0;

  for (const [userId, user] of Object.entries(asRecord(users))) {
    for (const blueprintId of getTrueKeys(asRecord(user).collection)) {
      if (!existingBlueprintIds.has(blueprintId)) {
        skippedEntries++;
        continue;
      }

      updates[`/blueprintCollectors/${blueprintId}/${userId}`] = true;
      backfilledUserIds.add(userId);
      entries++;
    }
  }

  return {
    updates,
    users: backfilledUserIds.size,
    entries,
    skippedEntries,
  };
};

export const getIndexedCollectorUserIds = (collectorIndex: unknown): string[] =>
  getTrueKeys(collectorIndex);

export const getLegacyCollectorUserIds = (users: unknown, blueprintId: string): string[] =>
  Object.entries(asRecord(users))
    .filter(([, user]) => asRecord(asRecord(user).collection)[blueprintId] === true)
    .map(([userId]) => userId);
