import { createStore, get, set, del } from 'idb-keyval';

let store;

self.onmessage = async function(e)
{
	const { type, key, data, id, storeConfig } = e.data;

	try
	{
		// Initialize store if needed
		if (!store && storeConfig)
		{
			store = createStore(storeConfig.dbName, storeConfig.storeName);
		}

		let result;

		switch (type)
		{
			case 'set':
				await set(key, data, store);
				result = { success: true };
				break;
			case 'get':
				result = { data: await get(key, store) };
				break;
			case 'delete':
				await del(key, store);
				result = { success: true };
				break;
			default:
				throw new Error('Unknown operation type');
		}

		self.postMessage({ id, result, success: true });
	}
	catch (error)
	{
		self.postMessage({
			id,
			error  : { message: error.message, stack: error.stack },
			success: false,
		});
	}
};
