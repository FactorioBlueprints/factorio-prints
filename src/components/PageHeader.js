import PropTypes from 'prop-types';
import React     from 'react';
import Row       from 'react-bootstrap/Row';

const PageHeader = ({title}) =>
	(
		<Row className='blueprint-grid-row justify-content-center'>
			<h1 className='display-4'>
				{title}
			</h1>
		</Row>
	);

PageHeader.propTypes = {
	title: PropTypes.string.isRequired,
};

export default PageHeader;
