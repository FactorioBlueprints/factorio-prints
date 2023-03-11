import React      from 'react';
import Form       from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

const SearchTextForm = ({textState, setTextState}) =>
{
	const handleText = e =>
	{
		e.preventDefault();
		setTextState(e.target.value);
	};

	return (
		<Form.Group className='mb-3'>
			<Form.Label>Text</Form.Label>
			<InputGroup>
				<Form.Control
					size="sm"
					type='text'
					placeholder='Text...'
					onChange={handleText}
					value={textState}
				/>
			</InputGroup>
		</Form.Group>
	);
};

SearchTextForm.propTypes    = {};
SearchTextForm.defaultProps = {};

export default SearchTextForm;
