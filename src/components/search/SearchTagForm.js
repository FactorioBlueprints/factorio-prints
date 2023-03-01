import React               from 'react';
import Form                from 'react-bootstrap/Form';
import useSimpleTagOptions from '../../hooks/useSimpleTagOptions';
import ReactQueryStatus    from './ReactQueryStatus';

const SearchTagForm = ({tagState, setTagState}) =>
{
	const handleTag = e =>
	{
		e.preventDefault();
		setTagState(e.target.value);
	};

	const {isLoading, error, data, isFetching, isSuccess} = useSimpleTagOptions();

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Tags
				<ReactQueryStatus
					isLoading={isLoading}
					error={error}
					data={data}
					isFetching={isFetching}
					isSuccess={isSuccess}
				/>
			</Form.Label>
			<Form.Select size="sm" aria-label='Select tag' onChange={handleTag} value={tagState}>
				<option value={''}>Any tag</option>
				{
					isSuccess && data.map(
						(tagOptionString, index) =>
							<option key={index} value={tagOptionString}>
								{tagOptionString}
							</option>,
					)
				}
			</Form.Select>
		</Form.Group>
	);
};

SearchTagForm.propTypes    = {};
SearchTagForm.defaultProps = {};

export default SearchTagForm;
