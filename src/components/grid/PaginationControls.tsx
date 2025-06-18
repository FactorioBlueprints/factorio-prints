import {faAngleDoubleLeft, faAngleLeft, faAngleRight} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import LoadingIcon from '../LoadingIcon';

interface PaginationControlsProps {
	page: number;
	setPage: (page: number | ((previous: number) => number)) => void;
	pageNumber: number;
	isPlaceholderData: boolean;
	numberOfPages: number;
}

function PaginationControls({page, setPage, pageNumber, isPlaceholderData, numberOfPages}: PaginationControlsProps) {
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
