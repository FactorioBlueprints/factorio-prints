import {faCheck, faClipboard, faToggleOff, faToggleOn} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useCallback, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import {useCopyToClipboard} from 'usehooks-ts';
import type {RawBlueprintData} from '../../schemas';
import {safeJsonStringify} from '../../utils/safeJsonStringify';
import BlueprintMarkdownDescription from '../BlueprintMarkdownDescription';

interface DetailsCardProps {
	descriptionMarkdown?: string;
	blueprintString?: string;
	parsedData?: RawBlueprintData;
	isLoading: boolean;
}

export function DetailsCard({descriptionMarkdown, blueprintString, parsedData, isLoading}: DetailsCardProps) {
	const [showBlueprint, setShowBlueprint] = useState(false);
	const [showJson, setShowJson] = useState(false);
	const [copiedText, copyToClipboard] = useCopyToClipboard();

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

	const handleShowHideBase64 = useCallback(() => {
		setShowBlueprint((prevState) => !prevState);
	}, []);

	const handleShowHideJson = useCallback(() => {
		setShowJson((prevState) => !prevState);
	}, []);

	return (
		<>
			<Card>
				<Card.Header>Details</Card.Header>
				<Card.Body>
					<BlueprintMarkdownDescription
						markdown={descriptionMarkdown}
						isLoading={isLoading}
					/>

					<Button
						type="button"
						variant="warning"
						onClick={() => copyToClipboard(blueprintString || '')}
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
						onClick={handleShowHideBase64}
					>
						{showBlueprint ? hideButton('Hide Blueprint') : showButton('Show Blueprint')}
					</Button>
					<Button
						type="button"
						onClick={handleShowHideJson}
					>
						{showJson ? hideButton('Hide Json') : showButton('Show Json')}
					</Button>
				</Card.Body>
			</Card>
			{showBlueprint && (
				<Card>
					<Card.Header>Blueprint String</Card.Header>
					<Card.Body>
						<div className="blueprintString">{blueprintString}</div>
					</Card.Body>
				</Card>
			)}
			{showJson && (
				<Card>
					<Card.Header>Json Representation</Card.Header>
					<Card.Body className="code">{safeJsonStringify(parsedData, 4)}</Card.Body>
				</Card>
			)}
		</>
	);
}
