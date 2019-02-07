export const loadState = () =>
{
	try
	{
		const serializedState = localStorage.getItem('factorio-redux-state');
		if (serializedState === null)
		{
			return undefined;
		}
		return JSON.parse(serializedState);
	}
	catch (error)
	{
		console.log('loadState', {error});
		return undefined;
	}
};

export const saveState = (state) =>
{
	try
	{
		const serializedState = JSON.stringify(state);
		localStorage.setItem('factorio-redux-state', serializedState);
	}
	catch (error)
	{
		console.log('saveState', {error});
	}
};
