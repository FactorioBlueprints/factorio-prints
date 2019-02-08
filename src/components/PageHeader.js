import PropTypes from 'prop-types';
import React     from 'react';
import Row       from 'react-bootstrap/Row';

const PageHeader = ({title}) =>
	(
		<Row className='justify-content-md-center'>
			<h1 className='pb-2 mt-4 mb-2'>
				{title}
			</h1>
		</Row>
	);

PageHeader.propTypes = {
	title: PropTypes.string.isRequired,
};

export default PageHeader;
