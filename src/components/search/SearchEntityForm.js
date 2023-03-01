import React            from 'react';
import Form             from 'react-bootstrap/Form';
import useEntityOptions from '../../hooks/useEntityOptions';
import ReactQueryStatus from './ReactQueryStatus';

const SearchEntityForm = ({entityState, setEntityState}) =>
{
	const handleEntity = e =>
	{
		e.preventDefault();
		setEntityState(e.target.value);
	};

	const {isLoading, error, data, isFetching, isSuccess} = useEntityOptions();

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Entities
				<ReactQueryStatus
					isLoading={isLoading}
					error={error}
					data={data}
					isFetching={isFetching}
					isSuccess={isSuccess}
				/>
			</Form.Label>
			<Form.Select size="sm" aria-label='Select entity' onChange={handleEntity} value={entityState}>
				<option value={''}>Any entity</option>
				{
					isSuccess && data.data.map(
						(entityOptionString, index) =>
							<option key={index} value={entityOptionString}>
								{entityOptionString}
							</option>,
					)
				}
			</Form.Select>
		</Form.Group>
	);
};

SearchEntityForm.propTypes    = {};
SearchEntityForm.defaultProps = {};

export default SearchEntityForm;
