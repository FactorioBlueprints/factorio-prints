import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import React, {useState} from 'react';

import Col from 'react-bootstrap/Col';
import FormControl from 'react-bootstrap/FormControl';
import InputGroup from 'react-bootstrap/InputGroup';

import {StringParam, useQueryParam, withDefault} from 'use-query-params';

EfficientSearchForm.propTypes = {};

function EfficientSearchForm() {
	const [titleFilter, setTitle] = useQueryParam('title', withDefault(StringParam, ''));

	const [localTitleFilter, setLocalTitleFilter] = useState(titleFilter);

	const debouncedSetTitleFilter = useAsyncDebounce((value) => setTitle(value || ''), 500);

	const handleSearchString = (event) => {
		event.preventDefault();

		const searchString = event.target.value;
		setLocalTitleFilter(searchString);
		debouncedSetTitleFilter(searchString);
	};

	const handleKeyDown = (event) => {
		if (event.key === 'Escape') {
			event.target.select();
			setTitle(event.target.value || '');
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

export function useGetLatest(obj) {
	const ref = React.useRef();
	ref.current = obj;

	return React.useCallback(() => ref.current, []);
}

// Debouncing taken from https://github.com/tannerlinsley/react-table/blob/master/src/publicUtils.js
// MIT License
// Copyright (c) 2016 Tanner Linsley
export function useAsyncDebounce(defaultFn, defaultWait = 0) {
	const debounceRef = React.useRef({});

	const getDefaultFn = useGetLatest(defaultFn);
	const getDefaultWait = useGetLatest(defaultWait);

	return React.useCallback(
		async (...args) => {
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
					debounceRef.current.resolve(await getDefaultFn()(...args));
				} catch (err) {
					debounceRef.current.reject(err);
				} finally {
					delete debounceRef.current.promise;
				}
			}, getDefaultWait());

			return debounceRef.current.promise;
		},
		[getDefaultFn, getDefaultWait],
	);
}

export default EfficientSearchForm;
