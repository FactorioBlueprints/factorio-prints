export type NullUpdate = Record<string, null>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const extractBlueprints = (exported: unknown): unknown =>
	isRecord(exported) && "blueprints" in exported ? exported.blueprints : exported;

export const buildAuthorDisplayNameStripUpdate = (blueprints: unknown): NullUpdate =>
{
	if (!isRecord(blueprints)) return {};

	const update: NullUpdate = {};
	for (const blueprintId of Object.keys(blueprints).sort())
	{
		const blueprint = blueprints[blueprintId];
		if (!isRecord(blueprint) || !isRecord(blueprint.author)) continue;
		const {displayName} = blueprint.author;
		if (displayName === undefined || displayName === null) continue;
		update[`blueprints/${blueprintId}/author/displayName`] = null;
	}
	return update;
};

export const chunkUpdate = (update: NullUpdate, chunkSize: number): NullUpdate[] =>
{
	const entries = Object.entries(update);
	const chunks: NullUpdate[] = [];
	for (let index = 0; index < entries.length; index += chunkSize)
	{
		chunks.push(Object.fromEntries(entries.slice(index, index + chunkSize)) as NullUpdate);
	}
	return chunks;
};
