interface BlueprintWithTags {
  tags?: unknown;
}

export const readTagList = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || !value.every((tag) => typeof tag === "string")) {
    throw new TypeError("Blueprint tags must be an array of strings.");
  }
  return value;
};

export const readBlueprintTags = (value: unknown): string[] => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Blueprint data must be an object.");
  }
  return readTagList((value as BlueprintWithTags).tags);
};

export const createTagIndexAdditions = (
  blueprintId: string,
  tags: string[],
): Record<string, true> =>
  Object.fromEntries(tags.map((tag) => [`/byTag/${tag}/${blueprintId}`, true]));

export const createTagIndexRemovals = (blueprintId: string, tags: string[]): Record<string, null> =>
  Object.fromEntries(tags.map((tag) => [`/byTag/${tag}/${blueprintId}`, null]));

export const createTagIndexUpdate = (
  blueprintId: string,
  previousTags: string[],
  currentTags: string[],
): Record<string, true | null> => {
  const addedTags = currentTags.filter((tag) => !previousTags.includes(tag));
  const removedTags = previousTags.filter((tag) => !currentTags.includes(tag));
  return {
    ...createTagIndexAdditions(blueprintId, addedTags),
    ...createTagIndexRemovals(blueprintId, removedTags),
  };
};
