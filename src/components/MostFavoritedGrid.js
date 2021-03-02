import React, {PureComponent}     from 'react';
import Container                  from 'react-bootstrap/Container';
import Row                        from 'react-bootstrap/Row';
import EfficientMostFavoritedGrid from './grid/EfficientMostFavoritedGrid';
import PageHeader                 from './PageHeader';
import EfficientSearchForm        from './search/EfficientSearchForm';
import EfficientTagForm           from './search/EfficientTagForm';

class MostFavoritedGrid extends PureComponent
{
	render()
	{
		return (
			<Container fluid>
				<PageHeader title='Most Favorited' />
				<Row>
					<EfficientSearchForm />
					<EfficientTagForm />
				</Row>
				<EfficientMostFavoritedGrid />
			</Container>
		);
	}
}

export default MostFavoritedGrid;
