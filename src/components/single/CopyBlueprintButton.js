import {faClipboard, faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}    from '@fortawesome/react-fontawesome';
import {forbidExtraProps}   from 'airbnb-prop-types';
import PropTypes            from 'prop-types';
import React                from 'react';
import Button               from 'react-bootstrap/Button';
import CopyToClipboard      from 'react-copy-to-clipboard';

import useBlueprintString from '../../hooks/useBlueprintString';

CopyBlueprintStringButton.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function CopyBlueprintStringButton(props)
{
	const {blueprintKey} = props;
	const result         = useBlueprintString(blueprintKey);

	const {isSuccess, isLoading, isError, data} = result;

	if (isLoading)
	{
		return (
			<Button type='button' variant='warning' disabled>
				<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />
				{' Copy to Clipboard'}
			</Button>
		);
	}

	if (isError)
	{
		console.log({result});
		return (
			<Button type='button' variant='warning' disabled>
				<FontAwesomeIcon icon={faClipboard} size='lg' fixedWidth />
				{' Copy to Clipboard'}
			</Button>
		);
	}

	const blueprintString = data.data;

	return (
		<CopyToClipboard text={blueprintString}>
			<Button type='button' variant='warning'>
				<FontAwesomeIcon icon={faClipboard} size='lg' fixedWidth />
				{' Copy to Clipboard'}
			</Button>
		</CopyToClipboard>
	);
}

export default CopyBlueprintStringButton;
