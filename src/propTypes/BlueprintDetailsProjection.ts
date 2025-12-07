import type {BlueprintGameData} from './BlueprintGameDataProjection';
import type {BlueprintVersion}  from './BlueprintVersionProjection';
import type {ImgurImage}        from './ImgurImageProjection';

export interface BlueprintDetailsAuthor
{
	userId: string,
	displayName: string,
}

export interface BlueprintDetailsTag
{
	tag: {
		category: string,
		name: string,
	},
}

export interface VoteSummary
{
	numberOfUpvotes?: number,
}

export interface BlueprintDetails
{
	key: string,
	title: string,
	descriptionMarkdown: string,
	voteSummary?: VoteSummary,
	systemFrom?: string,
	systemTo?: string,
	createdOn: string,
	lastUpdatedById: string,
	author: BlueprintDetailsAuthor,
	imgurImage: ImgurImage,
	tags: BlueprintDetailsTag[],
	gameData?: BlueprintGameData,
	version: BlueprintVersion,
}
