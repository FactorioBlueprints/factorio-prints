import type React from 'react';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Row from 'react-bootstrap/Row';
import LoadingIcon from '../LoadingIcon';

interface BlueprintStringControlProps {
	blueprintString?: string;
	setBlueprintString: (value: string) => void;
	isPending: boolean;
	isError: boolean;
}

function getBody(blueprintString: string | undefined, setBlueprintString: (value: string) => void, isPending: boolean) {
	if (isPending) {
		return (
			<>
				<LoadingIcon isPending={isPending} />
				{' Loading...'}
			</>
		);
	}

	function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
		setBlueprintString(event.target.value);
	}

	return (
		<FormControl
			className="blueprintString"
			as="textarea"
			name="blueprintString"
			placeholder="Blueprint String"
			value={blueprintString}
			onChange={handleChange}
		/>
	);
}

function BlueprintStringControl({blueprintString, setBlueprintString, isPending}: BlueprintStringControlProps) {
	const body = getBody(blueprintString, setBlueprintString, isPending);

	return (
		<Form.Group as={Row}>
			<Form.Label
				column
				sm="2"
			>
				{'Blueprint String'}
			</Form.Label>
			<Col sm={10}>{body}</Col>
		</Form.Group>
	);
}

export default BlueprintStringControl;
