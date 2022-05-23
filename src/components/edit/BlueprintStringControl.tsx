import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Col                from 'react-bootstrap/Col';
import Form               from 'react-bootstrap/Form';
import FormControl        from 'react-bootstrap/FormControl';
import Row                from 'react-bootstrap/Row';
import LoadingIcon        from "../LoadingIcon";

interface Props
{
	blueprintString: string | undefined,
	setBlueprintString: any,
	isLoading: boolean,
	isError: boolean,
}

BlueprintStringControl.propTypes = forbidExtraProps({
	blueprintString   : PropTypes.string,
	setBlueprintString: PropTypes.func.isRequired,
	isLoading         : PropTypes.bool.isRequired,
	isError           : PropTypes.bool.isRequired,
});

function getBody(blueprintString: string | undefined, setBlueprintString: any, isLoading: boolean, isError: boolean)
{
	if (isLoading)
	{
		return (
			<>
				<LoadingIcon isLoading={isLoading} />
				{' Loading...'}
			</>
		);
	}

	function handleChange(event: React.ChangeEvent<HTMLInputElement>)
	{
		setBlueprintString(event.target.value);
	}

	return (
		<FormControl
			className='blueprintString'
			as='textarea'
			name='blueprintString'
			placeholder='Blueprint String'
			value={blueprintString}
			onChange={handleChange}
		/>
	);
}

function BlueprintStringControl(props: Props): JSX.Element
{
	const {blueprintString, setBlueprintString, isLoading, isError} = props;

	const body: JSX.Element = getBody(blueprintString, setBlueprintString, isLoading, isError);

	return (
		<Form.Group as={Row}>
			<Form.Label column sm='2'>
				{'Blueprint String'}
			</Form.Label>
			<Col sm={10}>
				{body}
			</Col>
		</Form.Group>);
}

export default BlueprintStringControl;
