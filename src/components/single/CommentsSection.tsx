import Disqus from 'disqus-react';
import Row from 'react-bootstrap/Row';
import DisqusErrorBoundary from '../DisqusErrorBoundary';

interface DisqusConfig {
	url: string;
	identifier: string;
	title?: string;
}

interface CommentsSectionProps {
	blueprintId: string;
	blueprintTitle?: string;
}

export function CommentsSection({blueprintId, blueprintTitle}: CommentsSectionProps) {
	const disqusConfig: DisqusConfig = {
		url: `https://factorioprints.com/view/${blueprintId}`,
		identifier: blueprintId,
		title: blueprintTitle,
	};

	return (
		<Row className="w-100">
			<DisqusErrorBoundary>
				<div
					id="disqus_thread"
					style={{minHeight: '100px'}}
				>
					<Disqus.DiscussionEmbed
						shortname="factorio-blueprints"
						config={disqusConfig}
					/>
				</div>
			</DisqusErrorBoundary>
		</Row>
	);
}
