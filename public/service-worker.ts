/// <reference lib="webworker" />
// Kill switch service worker - unregisters itself and clears all caches

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', (): void => {
	sw.skipWaiting();
});

sw.addEventListener('activate', (event): void => {
	event.waitUntil(
		(async (): Promise<void> => {
			const cacheNames: string[] = await caches.keys();
			await Promise.all(cacheNames.map((name: string) => caches.delete(name)));

			await sw.clients.claim();

			await sw.registration.unregister();
		})(),
	);
});
