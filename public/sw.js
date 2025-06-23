// Kill switch service worker - unregisters itself and clears all caches
self.addEventListener('install', () =>
{
	self.skipWaiting();
});

self.addEventListener('activate', async (event) =>
{
	event.waitUntil((async () =>
	{
		const cacheNames = await caches.keys();
		await Promise.all(cacheNames.map(name => caches.delete(name)));

		await self.clients.claim();

		await self.registration.unregister();
	})());
});
