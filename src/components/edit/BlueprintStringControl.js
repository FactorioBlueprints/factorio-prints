import {forbidExtraProps} from '../../utils/propTypes';
import PropTypes          from 'prop-types';
import React              from 'react';
import Col                from 'react-bootstrap/Col';
import Form               from 'react-bootstrap/Form';
import FormControl        from 'react-bootstrap/FormControl';
import Row                from 'react-bootstrap/Row';
import LoadingIcon        from '../LoadingIcon';

BlueprintStringControl.propTypes = forbidExtraProps({
	blueprintString   : PropTypes.string,
	setBlueprintString: PropTypes.func.isRequired,
	isPending         : PropTypes.bool.isRequired,
	isError           : PropTypes.bool.isRequired,
});

function getBody(blueprintString, setBlueprintString, isPending)
{
	if (isPending)
	{
		return (
			<>
				<LoadingIcon isPending={isPending} />
				{' Loading...'}
			</>
		);
	}

	function handleChange(event)
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

function BlueprintStringControl(props)
{
	const {blueprintString, setBlueprintString, isPending} = props;

	const body = getBody(blueprintString, setBlueprintString, isPending);

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
