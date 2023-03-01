import React from 'react';
import Form  from 'react-bootstrap/Form';

import gameVersions from './gameVersions.json';

const SearchVersionForm = ({versionState, setVersionState}) =>
{
	const handleVersion = e =>
	{
		e.preventDefault();
		setVersionState(e.target.value);
	};

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Versions
			</Form.Label>
			<Form.Select size="sm" aria-label='Select version' onChange={handleVersion} value={versionState}>
				<option value={''}>Any version</option>
				{
					gameVersions.map(
						(versionObject) =>
							<option key={versionObject.versionNumber} value={versionObject.versionNumber}>
								{versionObject.version1}.{versionObject.version2}.{versionObject.version3}
							</option>,
					)
				}
			</Form.Select>
		</Form.Group>
	);
};

SearchVersionForm.propTypes    = {};
SearchVersionForm.defaultProps = {};

export default SearchVersionForm;
