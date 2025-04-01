export interface CompressionSettings {
	level: number;
	mem: number;
}

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
	level: 5,
	mem  : 2,
};
