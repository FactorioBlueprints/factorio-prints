import PropTypes from 'prop-types';
import React from 'react';
import Row from 'react-bootstrap/Row';

const EmptyResults = ({ isEmpty, children, filteredTags = [] }) =>
{
	if (!isEmpty) return null;

	// TODO 2025-04-12: Make the text more generic to more Grids. Possibly pass in the text, rather than filteredTags
	return (
		<Row className='blueprint-grid-row justify-content-center'>
			<div className='col-12 text-center'>
				<h3>No blueprints found</h3>
				{filteredTags.length > 0 ? (
					<p>Try removing some tag filters to see more results.</p>
				) : (
					children
				)}
			</div>
		</Row>
	);
};

EmptyResults.propTypes = {
	isEmpty     : PropTypes.bool.isRequired,
	children    : PropTypes.node,
	filteredTags: PropTypes.array,
};

export default EmptyResults;
