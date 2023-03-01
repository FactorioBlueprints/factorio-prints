import React      from 'react';
import Pagination from 'react-bootstrap/Pagination';
import paginate   from './paginate';

const CustomPagination = ({pageNumber, dataPageNumber, numberOfPages, setPage}) =>
{
	const paginateResult = paginate({current: pageNumber, max: numberOfPages});

	if (!paginateResult)
	{
		return <></>;
	}

	return (
		<Pagination className='justify-content-md-center'>
			<Pagination.First onClick={() => setPage(1)} active={pageNumber === 1} />
			<Pagination.Prev onClick={() => setPage(pageNumber - 1)} disabled={pageNumber <= 1} />
			{
				paginateResult.items.map((item, index) =>
				{
					return item === '…'
						? <Pagination.Ellipsis key={index} disabled />
						: (
							<Pagination.Item
								key={index}
								onClick={() => setPage(item)}
								active={item === dataPageNumber}
							>
								{item}
							</Pagination.Item>
						);
				})
			}
			<Pagination.Next onClick={() => setPage(pageNumber + 1)} disabled={pageNumber >= numberOfPages} />
			<Pagination.Last onClick={() => setPage(numberOfPages)} active={pageNumber === numberOfPages} />
		</Pagination>
	);
};

CustomPagination.propTypes    = {};
CustomPagination.defaultProps = {};

export default CustomPagination;
