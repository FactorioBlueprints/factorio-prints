import type {ImgurImageSummary} from './ImgurImageSummaryProjection';

export interface VoteSummary
{
	numberOfUpvotes?: number,
}

export interface BlueprintSummary
{
	key: string,
	title: string,
	numberOfUpvotes?: number,
	voteSummary?: VoteSummary,
	imgurImage: ImgurImageSummary,
	systemFrom?: string,
}
