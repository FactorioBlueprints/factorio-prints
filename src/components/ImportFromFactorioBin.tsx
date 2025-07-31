import {faFileImport, faSpinner} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useNavigate} from '@tanstack/react-router';
import type React from 'react';
import {useCallback, useState} from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import {deserializeBlueprintNoThrow} from '../parsing/blueprintParser';
import {saveToStorage, STORAGE_KEYS} from '../localStorage';
import PageHeader from './PageHeader';

interface ImportState {
	url: string;
	isLoading: boolean;
	error: string | null;
}

const CORS_PROXY_URL = 'https://factorio-blueprint-playground.pages.dev/proxy';

const ImportFromFactorioBin: React.FC = () => {
	const navigate = useNavigate();
	const [state, setState] = useState<ImportState>({
		url: '',
		isLoading: false,
		error: null,
	});

	const extractFactorioBinUrl = useCallback((input: string): string | null => {
		try {
			const trimmed = input.trim();

			const url = new URL(trimmed);
			const hostname = url.hostname.toLowerCase();

			if (hostname === 'factoriobin.com' || hostname === 'www.factoriobin.com') {
				return url.href;
			} else if (hostname === 'cdn.factoriobin.com') {
				return url.href;
			}

			return null;
		} catch {
			const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:cdn\.)?factoriobin\.com\/[^\s]*/i;
			const match = input.match(urlRegex);
			return match ? match[0] : null;
		}
	}, []);

	const fetchBlueprintFromFactorioBin = useCallback(async (url: string): Promise<string> => {
		let blueprintUrl = url;

		if (url.includes('factoriobin.com/post/') && !url.endsWith('/blueprint.txt')) {
			blueprintUrl = `${url}/blueprint.txt`;
		} else if (url.includes('cdn.factoriobin.com')) {
			blueprintUrl = url;
		}

		console.log('URL transformation:', {
			originalUrl: url,
			blueprintUrl,
		});

		console.log('Using CORS proxy for:', blueprintUrl);
		const proxyUrl = `${CORS_PROXY_URL}?${encodeURIComponent(blueprintUrl)}`;
		console.log('Proxy URL constructed:', proxyUrl);
		console.log('Target URL will be:', blueprintUrl);

		const response = await fetch(proxyUrl);

		console.log('Response details:', {
			status: response.status,
			statusText: response.statusText,
			headers: Object.fromEntries(response.headers.entries()),
			url: response.url,
			type: response.type,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('CORS proxy error:', errorText);
			throw new Error(`Failed to fetch blueprint: ${response.statusText}`);
		}

		const blueprintString = await response.text();

		console.log('Response from Factorio Bin:', {
			url: blueprintUrl,
			proxyUrl,
			responseLength: blueprintString.length,
			firstChars: blueprintString.substring(0, 100),
			startsWithZero: blueprintString.startsWith('0'),
			contentType: response.headers.get('content-type'),
		});

		if (blueprintString.startsWith('<!doctype html>') || blueprintString.startsWith('<html')) {
			console.error('Received HTML instead of blueprint. Full response:', blueprintString);
			console.log('Attempting no-cors fetch to:', blueprintUrl);
			try {
				const noCorsResponse = await fetch(blueprintUrl, {mode: 'no-cors'});
				console.log('No-cors response:', noCorsResponse);
				throw new Error('CORS proxy returned HTML. Factorio Bin may be blocking proxy requests.');
			} catch (e) {
				console.error('No-cors fetch also failed:', e);
				throw new Error(
					'Unable to fetch blueprint from Factorio Bin. The site may be blocking automated requests.',
				);
			}
		}

		const parsed = deserializeBlueprintNoThrow(blueprintString);
		if (!parsed) {
			console.error('Failed to parse blueprint:', blueprintString.substring(0, 200));
			throw new Error('Invalid blueprint format received from Factorio Bin');
		}

		return blueprintString;
	}, []);

	const handleImport = useCallback(async () => {
		const extractedUrl = extractFactorioBinUrl(state.url);

		if (!extractedUrl) {
			setState((prev) => ({
				...prev,
				error: 'Please enter a valid Factorio Bin URL',
			}));
			return;
		}

		setState((prev) => ({
			...prev,
			isLoading: true,
			error: null,
		}));

		try {
			const blueprintString = await fetchBlueprintFromFactorioBin(extractedUrl);

			const parsed = deserializeBlueprintNoThrow(blueprintString);
			if (parsed) {
				const blueprintData = parsed;
				let title = '';
				let description = '';

				if ('blueprint' in blueprintData && blueprintData.blueprint) {
					title = blueprintData.blueprint.label || '';
					description = blueprintData.blueprint.description || '';
				} else if ('blueprint_book' in blueprintData && blueprintData.blueprint_book) {
					title = blueprintData.blueprint_book.label || '';
					description = blueprintData.blueprint_book.description || '';
				}

				saveToStorage(STORAGE_KEYS.CREATE_FORM, {
					title: title || `Imported from Factorio Bin`,
					descriptionMarkdown: description || `Blueprint imported from: ${extractedUrl}`,
					blueprintString,
					imageUrl: '',
					tags: [],
				});
			}

			navigate({to: '/create'});
		} catch (error) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to import blueprint',
			}));
		}
	}, [state.url, extractFactorioBinUrl, fetchBlueprintFromFactorioBin, navigate]);

	const handleUrlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setState((prev) => ({
			...prev,
			url: event.target.value,
			error: null,
		}));
	}, []);

	return (
		<Container>
			<PageHeader title="Import from Factorio Bin" />

			<Row>
				<Col
					md={8}
					className="mx-auto"
				>
					<Card>
						<Card.Body>
							<Card.Title>Import Blueprint from Factorio Bin</Card.Title>
							<Card.Text>
								Paste a Factorio Bin URL to import the blueprint. Supported URL formats:
							</Card.Text>
							<ul>
								<li>https://factoriobin.com/post/...</li>
								<li>https://cdn.factoriobin.com/...</li>
							</ul>

							<Form
								onSubmit={(e) => {
									e.preventDefault();
									handleImport();
								}}
							>
								<Form.Group className="mb-3">
									<Form.Label>Factorio Bin URL</Form.Label>
									<Form.Control
										type="text"
										placeholder="https://factoriobin.com/post/..."
										value={state.url}
										onChange={handleUrlChange}
										disabled={state.isLoading}
										autoFocus
									/>
								</Form.Group>

								{state.error && (
									<Alert
										variant="danger"
										dismissible
										onClose={() => setState((prev) => ({...prev, error: null}))}
									>
										{state.error}
									</Alert>
								)}

								<Button
									variant="primary"
									type="submit"
									disabled={state.isLoading || !state.url.trim()}
								>
									{state.isLoading ? (
										<>
											<FontAwesomeIcon
												icon={faSpinner}
												spin
											/>
											{' Importing...'}
										</>
									) : (
										<>
											<FontAwesomeIcon icon={faFileImport} />
											{' Import Blueprint'}
										</>
									)}
								</Button>
							</Form>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		</Container>
	);
};

export default ImportFromFactorioBin;
