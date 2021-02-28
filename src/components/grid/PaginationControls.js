import {faAngleDoubleLeft, faAngleLeft, faAngleRight, faCog} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';

import Button from 'react-bootstrap/Button';
import Col    from 'react-bootstrap/Col';
import Row    from 'react-bootstrap/Row';

PaginationControls.propTypes = forbidExtraProps({
	page          : PropTypes.number.isRequired,
	setPage       : PropTypes.func.isRequired,
	pageNumber    : PropTypes.number.isRequired,
	isPreviousData: PropTypes.bool.isRequired,
	numberOfPages : PropTypes.number.isRequired,
});

function PaginationControls({page, setPage, pageNumber, isPreviousData, numberOfPages})
{
	function onClick()
	{
		if (!isPreviousData && numberOfPages > page)
		{
			setPage(old => old + 1);
		}
	}

	return (
		<Row className='justify-content-center'>
			{page !== pageNumber && <FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />}
			<Col md={{span: 6, offset: 3}}>
				<Button type='button' onClick={() => setPage(1)} disabled={page === 1}>
					<FontAwesomeIcon icon={faAngleDoubleLeft} size='lg' fixedWidth />
					{'First Page'}
				</Button>
				<Button type='button' onClick={() => setPage(old => Math.max(old - 1, 1))} disabled={page === 1}>
					<FontAwesomeIcon icon={faAngleLeft} size='lg' fixedWidth />
					{'Previous Page'}
				</Button>
				<Button variant='link' type='button' disabled>
					{`Page: ${page}`}
				</Button>
				<Button
					type='button' onClick={onClick} disabled={isPreviousData || numberOfPages <= page}
				>
					{'Next Page'}
					<FontAwesomeIcon icon={faAngleRight} size='lg' fixedWidth />
				</Button>
			</Col>
		</Row>
	);
}

export default PaginationControls;
