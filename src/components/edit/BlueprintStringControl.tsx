import React               from 'react';
import Col                 from 'react-bootstrap/Col';
import Form                from 'react-bootstrap/Form';
import FormControl         from 'react-bootstrap/FormControl';
import Row                 from 'react-bootstrap/Row';
import BlueprintFromServer from "./types/BlueprintFromServer";

interface Props {
	blueprint: BlueprintFromServer,
	handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

function BlueprintStringControl({blueprint, handleChange}: Props): JSX.Element
{
	const blueprintString: string | undefined = blueprint?.blueprintString?.blueprintString;
	console.log({blueprintString})
	return (
		<Form.Group as={Row}>
			<Form.Label column sm='2'>
				{'Blueprint String'}
			</Form.Label>
			<Col sm={10}>
				<FormControl
					className='blueprintString'
					as='textarea'
					name='blueprintString'
					placeholder='Blueprint String'
					value={blueprintString}
					onChange={handleChange}
				/>
			</Col>
		</Form.Group>);

}

export default BlueprintStringControl;
