import {faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}       from '@fortawesome/react-fontawesome';
import axios                   from 'axios';
import React                   from 'react';
import Container               from 'react-bootstrap/Container';
import Row                     from 'react-bootstrap/Row';
import {useQuery}              from 'react-query';

import FactorioPrintsThumbnail from '../FactorioPrintsThumbnail';
import PageHeader              from '../PageHeader';
import EfficientSearchForm     from '../search/EfficientSearchForm';
import EfficientTagForm        from '../search/EfficientTagForm';
import Spinner                 from '../single/Spinner';

function DuplicateBlueprintGrid()
{
	const fetchDuplicateBlueprintSummaries = async () =>
	{
		const url    = `${process.env.REACT_APP_REST_URL}/api/duplicates/`;
		const params = new URLSearchParams();
		const result = await axios.get(url, {params});
		return result.data;
	};

	const options = {
		keepPreviousData: true,
		placeholderData : {_data: []},
	};

	const result = useQuery(
		['duplicateBlueprints'],
		() => fetchDuplicateBlueprintSummaries(),
		options,
	);

	// TODO: Refactor out grid commonality

	const {isLoading, isError, data} = result;

	if (isLoading)
	{
		return <Spinner />
	}

	if (isError)
	{
		console.log({result});
		return (
			<div className='p-5 rounded-lg jumbotron'>
				<h1>
					<FontAwesomeIcon icon={faExclamationTriangle} size='lg' fixedWidth />
					{'Error loading blueprint summaries.'}
				</h1>
			</div>
		);
	}

	const {_data: blueprintSummaries} = data;

	return (
		<Container fluid>
			<PageHeader title='Duplicate Blueprints' />
			<Row>
				<EfficientSearchForm />
				<EfficientTagForm />
			</Row>
			<Row className='justify-content-center'>
				{
					blueprintSummaries.map(blueprintSummary =>
						(
							<FactorioPrintsThumbnail
								key={blueprintSummary.key}
								blueprintSummary={blueprintSummary}
							/>
						))
				}
			</Row>
		</Container>
	);
}

export default DuplicateBlueprintGrid;
