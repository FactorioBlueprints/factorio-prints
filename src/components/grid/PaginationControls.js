import {faAngleDoubleLeft, faAngleLeft, faAngleRight} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';
import React from 'react';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import LoadingIcon from '../LoadingIcon';

PaginationControls.propTypes = forbidExtraProps({
	page: PropTypes.number.isRequired,
	setPage: PropTypes.func.isRequired,
	pageNumber: PropTypes.number.isRequired,
	isPlaceholderData: PropTypes.bool.isRequired,
	numberOfPages: PropTypes.number.isRequired,
});

function PaginationControls({page, setPage, pageNumber, isPlaceholderData, numberOfPages}) {
	function onClick() {
		if (!isPlaceholderData && numberOfPages > page) {
			setPage((old) => old + 1);
		}
	}

	return (
		<Row className="justify-content-center">
			<LoadingIcon isPending={page !== pageNumber} />
			<Col md={{span: 6, offset: 3}}>
				<Button
					type="button"
					onClick={() => setPage(1)}
					disabled={page === 1}
				>
					<FontAwesomeIcon
						icon={faAngleDoubleLeft}
						size="lg"
						fixedWidth
					/>
					{'First Page'}
				</Button>
				<Button
					type="button"
					onClick={() => setPage((old) => Math.max(old - 1, 1))}
					disabled={page === 1}
				>
					<FontAwesomeIcon
						icon={faAngleLeft}
						size="lg"
						fixedWidth
					/>
					{'Previous Page'}
				</Button>
				<Button
					variant="link"
					type="button"
					disabled
				>
					{`Page: ${page}`}
				</Button>
				<Button
					type="button"
					onClick={onClick}
					disabled={isPlaceholderData || numberOfPages <= page}
				>
					{'Next Page'}
					<FontAwesomeIcon
						icon={faAngleRight}
						size="lg"
						fixedWidth
					/>
				</Button>
			</Col>
		</Row>
	);
}

export default PaginationControls;
