export type SignalType = string;

export type Quality = string | undefined;

export interface SignalID {
	name: string;
	type?: SignalType;
	quality?: Quality;
}
