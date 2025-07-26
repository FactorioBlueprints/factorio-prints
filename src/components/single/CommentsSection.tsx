import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import {useComments} from '../../hooks/useComments';
import {enrichComments} from '../../utils/comments';
import {CommentForm} from '../comments/CommentForm';
import {Comment} from '../comments/Comment';

interface CommentsSectionProps {
	blueprintId: string;
	blueprintTitle?: string;
}

export function CommentsSection({blueprintId}: CommentsSectionProps) {
	const {data: rawComments, isLoading, error} = useComments(blueprintId);

	if (isLoading) {
		return (
			<Row className="w-100">
				<Col>
					<div
						className="d-flex flex-column justify-content-center align-items-center"
						style={{minHeight: '100px'}}
					>
						<Spinner
							animation="border"
							role="status"
							variant="primary"
						/>
						<p className="mt-3 text-muted">Loading comments...</p>
					</div>
				</Col>
			</Row>
		);
	}

	if (error) {
		return (
			<Row className="w-100">
				<Col>
					<Alert variant="warning">Failed to load comments. Please try refreshing the page.</Alert>
				</Col>
			</Row>
		);
	}

	const enrichedComments = rawComments ? enrichComments(rawComments) : [];
	const commentCount = enrichedComments.length;

	return (
		<Row className="w-100">
			<Col>
				<div className="mb-4">
					<h4 className="mb-3">Comments ({commentCount})</h4>

					<div className="mb-4">
						<CommentForm blueprintId={blueprintId} />
					</div>

					{enrichedComments.length === 0 ? (
						<div className="text-center text-muted py-4">
							<p>No comments yet. Be the first to share your thoughts!</p>
						</div>
					) : (
						<div>
							{enrichedComments.map((comment) => (
								<Comment
									key={comment.id}
									comment={comment}
									blueprintId={blueprintId}
								/>
							))}
						</div>
					)}
				</div>
			</Col>
		</Row>
	);
}
