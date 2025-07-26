import {useState} from 'react';
import {getAuth} from 'firebase/auth';
import {useAuthState} from 'react-firebase-hooks/auth';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {app} from '../../base';
import {useCreateComment} from '../../hooks/useComments';

interface CommentFormProps {
	blueprintId: string;
	parentId?: string;
	onCancel?: () => void;
	placeholder?: string;
}

export function CommentForm({blueprintId, parentId, onCancel, placeholder = 'Write a comment...'}: CommentFormProps) {
	const [user] = useAuthState(getAuth(app));
	const [content, setContent] = useState('');
	const createCommentMutation = useCreateComment();

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!user || !content.trim()) {
			return;
		}

		try {
			await createCommentMutation.mutateAsync({
				blueprintId,
				authorId: user.uid,
				authorDisplayName: user.displayName || 'Anonymous',
				content: content.trim(),
				parentId,
			});
			setContent('');
			onCancel?.();
		} catch (error) {
			console.error('Error creating comment:', error);
		}
	};

	if (!user) {
		return <div className="p-3 text-center text-muted border rounded">Please sign in to leave a comment.</div>;
	}

	return (
		<Form onSubmit={handleSubmit}>
			<Form.Group className="mb-3">
				<Form.Control
					as="textarea"
					rows={3}
					placeholder={placeholder}
					value={content}
					onChange={(e) => setContent(e.target.value)}
					maxLength={5000}
				/>
				<Form.Text className="text-muted">{content.length}/5000 characters</Form.Text>
			</Form.Group>
			<div className="d-flex gap-2">
				<Button
					type="submit"
					variant="primary"
					disabled={!content.trim() || createCommentMutation.isPending}
				>
					{createCommentMutation.isPending ? 'Posting...' : parentId ? 'Reply' : 'Comment'}
				</Button>
				{onCancel && (
					<Button
						type="button"
						variant="secondary"
						onClick={onCancel}
					>
						Cancel
					</Button>
				)}
			</div>
		</Form>
	);
}
