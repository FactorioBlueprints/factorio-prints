import {useStore} from '@tanstack/react-store';
import type React from 'react';
import Pagination from 'react-bootstrap/Pagination';

import {advancedSearchStore, setPage} from '../../store/advancedSearchStore';

interface SearchPaginationProps {
	numberOfPages: number;
}

const SearchPagination: React.FC<SearchPaginationProps> = ({numberOfPages}) => {
	const currentPage = useStore(advancedSearchStore, (state) => state.page);

	if (numberOfPages <= 1) {
		return null;
	}

	const handlePageClick = (page: number): void => {
		setPage(page);
	};

	const renderPageItems = (): React.ReactElement[] => {
		const items: React.ReactElement[] = [];
		const maxVisible = 5;
		let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
		const endPage = Math.min(numberOfPages, startPage + maxVisible - 1);

		if (endPage - startPage + 1 < maxVisible) {
			startPage = Math.max(1, endPage - maxVisible + 1);
		}

		if (startPage > 1) {
			items.push(
				<Pagination.Item
					key={1}
					onClick={() => handlePageClick(1)}
				>
					1
				</Pagination.Item>,
			);
			if (startPage > 2) {
				items.push(
					<Pagination.Ellipsis
						key="ellipsis-start"
						disabled
					/>,
				);
			}
		}

		for (let page = startPage; page <= endPage; page++) {
			items.push(
				<Pagination.Item
					key={page}
					active={page === currentPage}
					onClick={() => handlePageClick(page)}
				>
					{page}
				</Pagination.Item>,
			);
		}

		if (endPage < numberOfPages) {
			if (endPage < numberOfPages - 1) {
				items.push(
					<Pagination.Ellipsis
						key="ellipsis-end"
						disabled
					/>,
				);
			}
			items.push(
				<Pagination.Item
					key={numberOfPages}
					onClick={() => handlePageClick(numberOfPages)}
				>
					{numberOfPages}
				</Pagination.Item>,
			);
		}

		return items;
	};

	return (
		<Pagination className="justify-content-center mt-3">
			<Pagination.First
				onClick={() => handlePageClick(1)}
				disabled={currentPage === 1}
			/>
			<Pagination.Prev
				onClick={() => handlePageClick(currentPage - 1)}
				disabled={currentPage === 1}
			/>
			{renderPageItems()}
			<Pagination.Next
				onClick={() => handlePageClick(currentPage + 1)}
				disabled={currentPage === numberOfPages}
			/>
			<Pagination.Last
				onClick={() => handlePageClick(numberOfPages)}
				disabled={currentPage === numberOfPages}
			/>
		</Pagination>
	);
};

export default SearchPagination;
