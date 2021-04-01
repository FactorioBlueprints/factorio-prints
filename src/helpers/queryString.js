import qs from 'query-string';

// Based on code from:
// https://medium.com/swlh/using-react-hooks-to-sync-your-component-state-with-the-url-query-string-81ccdfcb174f

const setQueryStringWithoutPageReload = (queryStringValue) =>
{
	const newUrl = window.location.protocol
		+ '//'
		+ window.location.host
		+ window.location.pathname
		+ queryStringValue;

	// TODO: Try to use effect
	window.history.pushState({path: newUrl}, '', newUrl);
};

export const setQueryStringValue = (
	key,
	value,
	oldQueryStringValue = window.location.search,
	options             = {arrayFormat: 'index'},
) =>
{
	const values              = qs.parse(oldQueryStringValue, options);
	const newQueryStringValue = qs.stringify({...values, [key]: value}, options);
	setQueryStringWithoutPageReload(`?${newQueryStringValue}`);
};

export const getQueryStringValue = (
	key,
	queryString = window.location.search,
	options     = {arrayFormat: 'index'},
) =>
{
	const values = qs.parse(queryString, options);
	return values[key];
};
