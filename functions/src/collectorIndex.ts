type DataRecord = Record<string, unknown>;

const asRecord = (value: unknown): DataRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value) ? (value as DataRecord) : {};

const getTrueKeys = (value: unknown): string[] =>
	Object.entries(asRecord(value))
		.filter(([, isPresent]) => isPresent === true)
		.map(([key]) => key);

export const getIndexedCollectorUserIds = (collectorIndex: unknown): string[] => getTrueKeys(collectorIndex);
