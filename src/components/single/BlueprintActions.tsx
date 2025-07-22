import {faCheck, faClipboard, faToggleOff, faToggleOn} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useCallback} from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

interface BlueprintActionsProps {
	blueprintString?: string;
	showBlueprint: boolean;
	showJson: boolean;
	copiedText: string;
	onCopyToClipboard: (text: string) => void;
	onToggleShowBlueprint: () => void;
	onToggleShowJson: () => void;
}

export function BlueprintActions({
	blueprintString,
	showBlueprint,
	showJson,
	copiedText,
	onCopyToClipboard,
	onToggleShowBlueprint,
	onToggleShowJson,
}: BlueprintActionsProps) {
	const hideButton = useCallback(
		(text: string) => (
			<>
				<FontAwesomeIcon
					icon={faToggleOn}
					size="lg"
					fixedWidth
					className="text-success"
				/>
				{` ${text}`}
			</>
		),
		[],
	);

	const showButton = useCallback(
		(text: string) => (
			<>
				<FontAwesomeIcon
					icon={faToggleOff}
					size="lg"
					fixedWidth
				/>
				{` ${text}`}
			</>
		),
		[],
	);

	return (
		<Card.Body>
			<Button
				type="button"
				variant="warning"
				onClick={() => onCopyToClipboard(blueprintString || '')}
			>
				<FontAwesomeIcon
					icon={copiedText ? faCheck : faClipboard}
					size="lg"
					fixedWidth
				/>
				{' Copy to Clipboard'}
			</Button>
			<Button
				type="button"
				onClick={onToggleShowBlueprint}
			>
				{showBlueprint ? hideButton('Hide Blueprint') : showButton('Show Blueprint')}
			</Button>
			<Button
				type="button"
				onClick={onToggleShowJson}
			>
				{showJson ? hideButton('Hide Json') : showButton('Show Json')}
			</Button>
		</Card.Body>
	);
}
