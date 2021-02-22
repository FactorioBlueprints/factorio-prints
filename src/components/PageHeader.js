import {forbidExtraProps} from 'airbnb-prop-types';

import PropTypes from 'prop-types';
import React     from 'react';
import Row       from 'react-bootstrap/Row';

const PageHeader = ({title}) =>
	(
		<Row className='justify-content-center'>
			<h1 className='display-4'>
				{title}
			</h1>
		</Row>
	);

PageHeader.propTypes = forbidExtraProps({
	title: PropTypes.string.isRequired,
});

export default PageHeader;
