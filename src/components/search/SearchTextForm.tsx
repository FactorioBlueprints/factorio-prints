import Form       from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

interface SearchTextFormProps {
	textState: string;
	setTextState: (value: string) => void;
}

function SearchTextForm({textState, setTextState}: SearchTextFormProps)
{
	const handleText = (e: React.ChangeEvent<HTMLInputElement>) =>
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
}

export default SearchTextForm;
