import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import type React from 'react';
import {useCallback, useRef, useState} from 'react';

import Col from 'react-bootstrap/Col';
import FormControl from 'react-bootstrap/FormControl';
import InputGroup from 'react-bootstrap/InputGroup';

import {StringParam, useQueryParam, withDefault} from 'use-query-params';

function useGetLatest<T>(obj: T): () => T {
	const ref = useRef<T>(obj);
	ref.current = obj;

	return useCallback(() => ref.current, []);
}

// biome-ignore lint/suspicious/noExplicitAny: generic function type needs any for variance
function useAsyncDebounce<T extends (...args: any[]) => any>(
	defaultFn: T,
	defaultWait = 0,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	const debounceRef = useRef<{
		promise?: Promise<ReturnType<T>>;
		resolve?: (value: ReturnType<T>) => void;
		reject?: (reason: unknown) => void;
		timeout?: ReturnType<typeof setTimeout>;
	}>({});

	const getDefaultFn = useGetLatest(defaultFn);
	const getDefaultWait = useGetLatest(defaultWait);

	return useCallback(
		async (...args: Parameters<T>): Promise<ReturnType<T>> => {
			if (!debounceRef.current.promise) {
				debounceRef.current.promise = new Promise((resolve, reject) => {
					debounceRef.current.resolve = resolve;
					debounceRef.current.reject = reject;
				});
			}

			if (debounceRef.current.timeout) {
				clearTimeout(debounceRef.current.timeout);
			}

			debounceRef.current.timeout = setTimeout(async () => {
				delete debounceRef.current.timeout;
				try {
					debounceRef.current.resolve?.(await getDefaultFn()(...args));
				} catch (err) {
					debounceRef.current.reject?.(err);
				} finally {
					delete debounceRef.current.promise;
				}
			}, getDefaultWait());

			return debounceRef.current.promise;
		},
		[getDefaultFn, getDefaultWait],
	);
}

function EfficientSearchForm() {
	const [titleFilter, setTitle] = useQueryParam('title', withDefault(StringParam, ''));

	const [localTitleFilter, setLocalTitleFilter] = useState(titleFilter);

	const debouncedSetTitleFilter = useAsyncDebounce((value: string) => setTitle(value || ''), 500);

	const handleSearchString = (event: React.ChangeEvent<HTMLInputElement>) => {
		event.preventDefault();

		const searchString = event.target.value;
		setLocalTitleFilter(searchString);
		debouncedSetTitleFilter(searchString);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Escape') {
			event.currentTarget.select();
			setTitle(event.currentTarget.value || '');
		}
	};

	return (
		<Col md={6}>
			<InputGroup
				size="sm"
				className="search-form"
			>
				<FormControl
					placeholder="search titles"
					value={localTitleFilter}
					onChange={handleSearchString}
					onKeyDown={handleKeyDown}
				/>
				<InputGroup.Text className="p-1">
					<FontAwesomeIcon icon={faSearch} />
				</InputGroup.Text>
			</InputGroup>
		</Col>
	);
}

export {useGetLatest, useAsyncDebounce};
export default EfficientSearchForm;
