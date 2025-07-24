/// <reference lib="webworker" />
// Kill switch service worker - unregisters itself and clears all caches

self.addEventListener('install', (): void => {
	(self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener('activate', async (event: ExtendableEvent): Promise<void> => {
	event.waitUntil(
		(async (): Promise<void> => {
			const cacheNames: string[] = await caches.keys();
			await Promise.all(cacheNames.map((name: string) => caches.delete(name)));

			await (self as unknown as ServiceWorkerGlobalScope).clients.claim();

			await (self as unknown as ServiceWorkerGlobalScope).registration.unregister();
		})(),
	);
});
