import {faClipboard}      from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Button             from 'react-bootstrap/Button';
import CopyToClipboard    from 'react-copy-to-clipboard';

import useBlueprintStringSha from '../../hooks/useBlueprintStringSha';
import LoadingIcon           from '../LoadingIcon';

CopyBlueprintStringButton.propTypes = forbidExtraProps({
	blueprintStringSha: PropTypes.string,
});

function CopyBlueprintStringButton({blueprintStringSha})
{
	const result = useBlueprintStringSha(blueprintStringSha);

	const {isLoading, isError, data} = result;

	if (isLoading)
	{
		return (
			<Button type='button' variant='warning' disabled>
				<LoadingIcon isLoading={isLoading} />
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

	const blueprintString = data.data.blueprintString;

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
