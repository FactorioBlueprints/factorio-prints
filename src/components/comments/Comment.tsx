import {useState} from 'react';
import {getAuth} from 'firebase/auth';
import {useAuthState} from 'react-firebase-hooks/auth';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import {formatDistanceToNow} from 'date-fns';
import {app} from '../../base';
import {useUpdateComment, useDeleteComment} from '../../hooks/useComments';
import type {EnrichedComment} from '../../schemas';
import {CommentForm} from './CommentForm';

interface CommentProps {
	comment: EnrichedComment;
	blueprintId: string;
	depth?: number;
}

export function Comment({comment, blueprintId, depth = 0}: CommentProps) {
	const [user] = useAuthState(getAuth(app));
	const [isEditing, setIsEditing] = useState(false);
	const [isReplying, setIsReplying] = useState(false);
	const [editContent, setEditContent] = useState(comment.content);

	const updateCommentMutation = useUpdateComment();
	const deleteCommentMutation = useDeleteComment();

	const isAuthor = user?.uid === comment.authorId;
	const canEdit = isAuthor && !comment.isDeleted;
	const maxDepth = 5;

	const handleEdit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!user || !editContent.trim()) {
			return;
		}

		try {
			await updateCommentMutation.mutateAsync({
				blueprintId,
				commentId: comment.id,
				content: editContent.trim(),
				authorId: user.uid,
			});
			setIsEditing(false);
		} catch (error) {
			console.error('Error updating comment:', error);
		}
	};

	const handleDelete = async () => {
		if (!user || !confirm('Are you sure you want to delete this comment?')) {
			return;
		}

		try {
			await deleteCommentMutation.mutateAsync({
				blueprintId,
				commentId: comment.id,
				authorId: user.uid,
			});
		} catch (error) {
			console.error('Error deleting comment:', error);
		}
	};

	const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {addSuffix: true});
	const isEdited = comment.updatedAt && comment.updatedAt !== comment.createdAt;

	return (
		<div className={`${depth > 0 ? 'ms-4' : ''} mb-3`}>
			<Card>
				<Card.Body>
					<div className="d-flex justify-content-between align-items-start mb-2">
						<div>
							<strong>{comment.authorDisplayName}</strong>
							<small className="text-muted ms-2">
								{timeAgo}
								{isEdited && ' (edited)'}
							</small>
						</div>
						{canEdit && (
							<div className="d-flex gap-1">
								<Button
									variant="link"
									size="sm"
									className="p-0 text-muted"
									onClick={() => setIsEditing(true)}
								>
									Edit
								</Button>
								<Button
									variant="link"
									size="sm"
									className="p-0 text-danger"
									onClick={handleDelete}
									disabled={deleteCommentMutation.isPending}
								>
									Delete
								</Button>
							</div>
						)}
					</div>

					{isEditing ? (
						<Form onSubmit={handleEdit}>
							<Form.Group className="mb-3">
								<Form.Control
									as="textarea"
									rows={3}
									value={editContent}
									onChange={(e) => setEditContent(e.target.value)}
									maxLength={5000}
								/>
							</Form.Group>
							<div className="d-flex gap-2">
								<Button
									type="submit"
									variant="primary"
									size="sm"
									disabled={!editContent.trim() || updateCommentMutation.isPending}
								>
									{updateCommentMutation.isPending ? 'Saving...' : 'Save'}
								</Button>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => {
										setIsEditing(false);
										setEditContent(comment.content);
									}}
								>
									Cancel
								</Button>
							</div>
						</Form>
					) : (
						<>
							<div
								className="mb-2"
								style={{whiteSpace: 'pre-wrap'}}
							>
								{comment.content}
							</div>
							{!comment.isDeleted && depth < maxDepth && (
								<div className="d-flex gap-2">
									<Button
										variant="link"
										size="sm"
										className="p-0"
										onClick={() => setIsReplying(!isReplying)}
									>
										Reply
									</Button>
								</div>
							)}
						</>
					)}

					{isReplying && (
						<div className="mt-3">
							<CommentForm
								blueprintId={blueprintId}
								parentId={comment.id}
								onCancel={() => setIsReplying(false)}
								placeholder="Write a reply..."
							/>
						</div>
					)}
				</Card.Body>
			</Card>

			{comment.replyComments && comment.replyComments.length > 0 && (
				<div className="mt-2">
					{comment.replyComments.map((reply: EnrichedComment) => (
						<Comment
							key={reply.id}
							comment={reply}
							blueprintId={blueprintId}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}
