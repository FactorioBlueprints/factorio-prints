import ImgurImage from "./ImgurImage";
import Tag        from "./Tag";

export default interface BlueprintFromServer
{
	key: string,
	systemFrom: string,
	systemTo?: string,
	createdOn: string,
	lastUpdatedById: string,
	title: string,
	descriptionMarkdown: string,
	author: {
		userId: string,
		displayName: string,
	}
	blueprintString: {
		blueprintString: string
	},
	tags: { tag: Tag }[],
	imgurImage: ImgurImage,
}
