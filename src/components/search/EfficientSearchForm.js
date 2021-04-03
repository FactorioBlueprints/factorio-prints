import {faSearch}        from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import React, {useContext, useState} from 'react';

import Col        from 'react-bootstrap/Col';
import Form       from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import SearchContext from '../../context/searchContext';

EfficientSearchForm.propTypes = {};

function EfficientSearchForm()
{
	const {titleFilter, setTitleFilter}           = useContext(SearchContext);
	const [localTitleFilter, setLocalTitleFilter] = useState(titleFilter);

	const debouncedSetTitleFilter = useAsyncDebounce((value) => setTitleFilter(value || ''), 500);

	const handleSearchString = (event) =>
	{
		event.preventDefault();

		const searchString = event.target.value;
		setLocalTitleFilter(searchString);
		debouncedSetTitleFilter(searchString);
	};

	const handleKeyDown = (event) =>
	{
		if (event.key === 'Escape')
		{
			event.target.select();
		}
	};

	return (
		<Col md={6}>
			<InputGroup size='sm' className='search-form'>
				<Form.Control
					type='text'
					placeholder='search titles'
					value={localTitleFilter}
					onChange={handleSearchString}
					onKeyDown={handleKeyDown}
				/>
				<InputGroup.Append>
					<InputGroup.Text>
						<FontAwesomeIcon icon={faSearch} />
					</InputGroup.Text>
				</InputGroup.Append>
			</InputGroup>
		</Col>
	);
}

export function useGetLatest(obj)
{
	const ref   = React.useRef();
	ref.current = obj;

	return React.useCallback(() => ref.current, []);
}

// Debouncing taken from https://github.com/tannerlinsley/react-table/blob/master/src/publicUtils.js
// MIT License
// Copyright (c) 2016 Tanner Linsley
export function useAsyncDebounce(defaultFn, defaultWait = 0)
{
	const debounceRef = React.useRef({});

	const getDefaultFn   = useGetLatest(defaultFn);
	const getDefaultWait = useGetLatest(defaultWait);

	return React.useCallback(
		async (...args) =>
		{
			if (!debounceRef.current.promise)
			{
				debounceRef.current.promise = new Promise((resolve, reject) =>
				{
					debounceRef.current.resolve = resolve;
					debounceRef.current.reject  = reject;
				});
			}

			if (debounceRef.current.timeout)
			{
				clearTimeout(debounceRef.current.timeout);
			}

			debounceRef.current.timeout = setTimeout(async () =>
			{
				delete debounceRef.current.timeout;
				try
				{
					debounceRef.current.resolve(await getDefaultFn()(...args));
				}
				catch (err)
				{
					debounceRef.current.reject(err);
				}
				finally
				{
					delete debounceRef.current.promise;
				}
			}, getDefaultWait());

			return debounceRef.current.promise;
		},
		[getDefaultFn, getDefaultWait],
	);
}

export default EfficientSearchForm;
