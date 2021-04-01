// Based on code from:
// https://medium.com/swlh/using-react-hooks-to-sync-your-component-state-with-the-url-query-string-81ccdfcb174f

import {useCallback, useState}                    from 'react';
import {getQueryStringValue, setQueryStringValue} from '../helpers/queryString';

function useQueryString(key, initialValue)
{
	const [value, setValue] = useState(getQueryStringValue(key) || initialValue);
	const onSetValue        = useCallback(
		(newValue) =>
		{
			console.log('useQueryString.onSetValue.useCallback', {key, newValue});
			setValue(newValue);
			setQueryStringValue(key, newValue);
		},
		[key],
	);

	return [value, onSetValue];
}

export default useQueryString;
