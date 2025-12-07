import {faCheck, faClipboard} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import copy                   from 'copy-to-clipboard';
import React, {useEffect, useState} from 'react';
import Button                 from 'react-bootstrap/Button';

import useBlueprintStringSha from '../../hooks/useBlueprintStringSha';
import LoadingIcon           from '../LoadingIcon';

interface CopyBlueprintStringButtonProps {
	blueprintStringSha?: string;
}

function CopyBlueprintStringButton({blueprintStringSha}: CopyBlueprintStringButtonProps)
{
	const [copyClicked, setCopyClicked] = useState(false);
	const [copied, setCopied] = useState(false);

	function handleCopy()
	{
		setCopyClicked(true);
	}

	const result = useBlueprintStringSha(copyClicked && !copied ? blueprintStringSha : undefined);

	const {isPending, isError, isSuccess, data} = result;

	useEffect(
		() =>
		{
			if (copyClicked && !copied && isSuccess)
			{
				const blueprintString = (data as any).data.blueprintString;
				copy(blueprintString);
				setCopied(true);
				setTimeout(() =>
				{
					setCopyClicked(false);
					setCopied(false);
				}, 2000);
			}
		},
		[blueprintStringSha, copyClicked, copied, data, isSuccess])

	if (copied)
	{
		return <Button type='button' variant='warning' disabled>
			<FontAwesomeIcon icon={faCheck} size='lg' fixedWidth />
			{' Copied!'}
		</Button>
	}

	if (isPending && copyClicked && !copied)
	{
		return (
			<Button type='button' variant='warning' disabled>
				<LoadingIcon isPending={isPending} />
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

	return (
		<Button type='button' variant='warning' onClick={() => handleCopy()}>
			<FontAwesomeIcon icon={faClipboard} size='lg' fixedWidth />
			{' Copy to Clipboard'}
		</Button>
	);
}

export default CopyBlueprintStringButton;
