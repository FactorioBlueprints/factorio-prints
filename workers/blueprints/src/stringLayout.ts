// Blueprint string storage constants shared by the Worker and the Node import scripts. Kept apart from strings.ts,
// which needs the Workers runtime types.

/** The value written to blueprint_string.blueprint_string while the column still exists. */
export const STRING_STORED_IN_R2 = "";

/** The R2 object key of the string with this digest. */
export const blueprintStringObjectKey = (sha: string): string => `strings/${sha}`;
