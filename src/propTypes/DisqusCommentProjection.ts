export interface DisqusCommentAuthor {
	name: string;
	username: string;
}

export interface DisqusComment {
	id: number;
	text: string;
	deleted: boolean;
	createdOn?: string;
	systemFrom?: string;
	systemTo?: string;
	author?: DisqusCommentAuthor;
	replies?: DisqusComment[];
}
