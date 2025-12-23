import {Link} from '@tanstack/react-router';
import type React from 'react';
import Button from 'react-bootstrap/Button';

interface TagBadgeProps {
	tag: string;
}

const TagBadge: React.FC<TagBadgeProps> = ({tag}) => {
	if (!tag.startsWith('/') || !tag.endsWith('/')) {
		throw new Error(`TagBadge: tag "${tag}" must have leading and trailing slashes`);
	}

	const normalizedTag = tag.replace(/^\/|\/$/g, '');

	const parts = normalizedTag.split('/');

	if (parts.length !== 2) {
		throw new Error(`TagBadge: normalized tag "${normalizedTag}" should have exactly one slash`);
	}

	const [category, name] = parts;

	return (
		<Link
			key={tag}
			to="/tagged/$category/$name"
			params={{category, name}}
			className="m-1"
			from="/"
		>
			<Button
				variant="outline-warning"
				size="sm"
			>
				{normalizedTag}
			</Button>
		</Link>
	);
};

export default TagBadge;
