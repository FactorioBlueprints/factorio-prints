// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vite-plus/test";

const serviceWorkerFileNames = ["service-worker.js", "serviceWorker.js", "sw.js"];
const serviceWorkerFilePattern = /^(service-worker|serviceWorker|sw)\./;

const readPublicFile = (fileName: string) =>
  readFileSync(resolve(process.cwd(), "public", fileName), "utf8");

const getServiceWorkerFileNames = (directory: string) =>
  readdirSync(resolve(process.cwd(), directory))
    .filter((fileName) => serviceWorkerFilePattern.test(fileName))
    .sort();

describe("service worker tombstones", () => {
  it("publishes plain JavaScript at every historical path and removes the TypeScript tombstone", () => {
    expect(getServiceWorkerFileNames("public")).toStrictEqual([...serviceWorkerFileNames].sort());
    expect(serviceWorkerFileNames.map(readPublicFile)).toStrictEqual([
      readPublicFile("service-worker.js"),
      readPublicFile("service-worker.js"),
      readPublicFile("service-worker.js"),
    ]);
  });

  it.each(serviceWorkerFileNames)(
    "%s activates immediately, removes caches, claims clients, and unregisters",
    async (fileName) => {
      const eventListeners = new Map<
        string,
        (event: { waitUntil(promise: Promise<void>): void }) => void
      >();
      const deletedCacheNames: string[] = [];
      const skipWaiting = vi.fn();
      const claim = vi.fn().mockResolvedValue(undefined);
      const unregister = vi.fn().mockResolvedValue(true);
      let activation: Promise<void> | undefined;

      const workerGlobal = {
        addEventListener: vi.fn(
          (
            eventName: string,
            listener: (event: { waitUntil(promise: Promise<void>): void }) => void,
          ) => {
            eventListeners.set(eventName, listener);
          },
        ),
        clients: { claim },
        registration: { unregister },
        skipWaiting,
      };

      runInNewContext(readPublicFile(fileName), {
        Promise,
        caches: {
          delete: vi.fn(async (cacheName: string) => {
            deletedCacheNames.push(cacheName);
            return true;
          }),
          keys: vi.fn().mockResolvedValue(["precache-v1", "runtime-v2"]),
        },
        self: workerGlobal,
      });

      eventListeners.get("install")?.({ waitUntil: vi.fn() });
      eventListeners.get("activate")?.({
        waitUntil(promise) {
          activation = promise;
        },
      });
      await activation;

      expect([...eventListeners.keys()]).toStrictEqual(["install", "activate"]);
      expect(skipWaiting).toHaveBeenCalledOnce();
      expect(deletedCacheNames).toStrictEqual(["precache-v1", "runtime-v2"]);
      expect(claim).toHaveBeenCalledOnce();
      expect(unregister).toHaveBeenCalledOnce();
    },
  );
});

describe.runIf(process.env.VERIFY_SERVICE_WORKER_BUILD === "true")(
  "production service worker tombstones",
  () => {
    it("copies exactly the JavaScript tombstones to the build without transformation", () => {
      expect(getServiceWorkerFileNames("dist")).toStrictEqual([...serviceWorkerFileNames].sort());

      for (const fileName of serviceWorkerFileNames) {
        expect(readFileSync(resolve(process.cwd(), "dist", fileName), "utf8")).toBe(
          readPublicFile(fileName),
        );
      }
    });
  },
);
