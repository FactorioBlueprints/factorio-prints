export interface CompressionSettings {
	level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
	mem: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
}

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
	level: 5,
	mem: 2,
};
