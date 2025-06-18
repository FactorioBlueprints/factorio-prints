import Pagination from 'react-bootstrap/Pagination';
import paginate from './paginate';

interface CustomPaginationProps {
	pageNumber: number;
	dataPageNumber: number;
	numberOfPages: number;
	setPage: (page: number) => void;
}

function CustomPagination({pageNumber, dataPageNumber, numberOfPages, setPage}: CustomPaginationProps) {
	const paginateResult = paginate({current: pageNumber, max: numberOfPages}) as {
		current: number;
		prev: number | null;
		next: number | null;
		items: (number | string)[];
	} | null;

	if (!paginateResult) {
		return null;
	}

	return (
		<Pagination className="justify-content-md-center">
			<Pagination.First
				onClick={() => setPage(1)}
				active={pageNumber === 1}
			/>
			<Pagination.Prev
				onClick={() => setPage(pageNumber - 1)}
				disabled={pageNumber <= 1}
			/>
			{paginateResult.items.map((item, index) => {
				return typeof item === 'string' ? (
					<Pagination.Ellipsis
						key={`ellipsis-${index}`}
						disabled
					/>
				) : (
					<Pagination.Item
						key={`page-${item}`}
						onClick={() => setPage(item)}
						active={item === dataPageNumber}
					>
						{item}
					</Pagination.Item>
				);
			})}
			<Pagination.Next
				onClick={() => setPage(pageNumber + 1)}
				disabled={pageNumber >= numberOfPages}
			/>
			<Pagination.Last
				onClick={() => setPage(numberOfPages)}
				active={pageNumber === numberOfPages}
			/>
		</Pagination>
	);
}

export default CustomPagination;
