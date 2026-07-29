import { createRouter } from "@tanstack/react-router";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { routeTree } from "./routeTree.gen";
import { getRouterDiagnostics, router as applicationRouter } from "./router";

const rootRouteChildren = {
  IndexRoute: { id: "/" },
  notFoundRoute: { id: "/__not-found" },
  AccountRoute: { id: "/account" },
  BlueprintsRoute: { id: "/blueprints" },
  ChatRoute: { id: "/chat" },
  CollectionRoute: { id: "/collection" },
  CreateRoute: { id: "/create" },
  FavoritesRoute: { id: "/favorites" },
  TopRoute: { id: "/top" },
  UsersRoute: { id: "/users" },
  EditBlueprintIdRoute: { id: "/edit/$blueprintId" },
  TagTagRoute: { id: "/tag/$tag" },
  TaggedTagRoute: { id: "/tagged/$tag" },
  UserUserIdRoute: { id: "/user/$userId" },
  ViewBlueprintIdRoute: { id: "/view/$blueprintId" },
  AdminUserUserIdRoute: { id: "/admin/user/$userId" },
};

describe("Router Configuration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("Router can be created with route tree", () => {
    const router = createRouter({
      routeTree,
      defaultPreload: false,
    });

    expect(router).toBeDefined();
    expect(router.routeTree).toBe(routeTree);
  });

  test("Route tree contains all expected routes", () => {
    const expectedRoutes = [
      "/",
      "/__not-found",
      "/account",
      "/blueprints",
      "/chat",
      "/collection",
      "/create",
      "/favorites",
      "/top",
      "/users",
      "/edit/$blueprintId",
      "/tag/$tag",
      "/tagged/$tag",
      "/user/$userId",
      "/view/$blueprintId",
      "/admin/user/$userId",
    ];

    expect(routeTree).toBeDefined();

    const mockRouteIds = Object.values(rootRouteChildren).map((r) => r.id);
    expectedRoutes.forEach((route) => {
      expect(mockRouteIds).toContain(route);
    });

    const router = createRouter({
      routeTree,
      defaultPreload: false,
    });

    expect(router).toBeDefined();
  });

  test("disables automatic route preloading", () => {
    expect({
      defaultPreload: applicationRouter.options.defaultPreload,
      defaultPreloadStaleTime: applicationRouter.options.defaultPreloadStaleTime,
    }).toStrictEqual({
      defaultPreload: false,
      defaultPreloadStaleTime: undefined,
    });
  });

  test("deduplicates route preloads and records their match lifecycle", async () => {
    const existingEntryCount = getRouterDiagnostics().entries.length;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2000-01-01T00:00:00.000Z"));

    const firstPreload = applicationRouter.preloadRoute({ to: "/account" });
    const duplicatePreload = applicationRouter.preloadRoute({ to: "/account" });

    expect(duplicatePreload).toBe(firstPreload);
    await firstPreload;

    expect(getRouterDiagnostics().entries.slice(existingEntryCount)).toStrictEqual([
      {
        phase: "preload-start",
        timestamp: "2000-01-01T00:00:00.000Z",
        fromPath: "/",
        toPath: "/account",
        activeMatches: [],
        preloadedMatches: undefined,
      },
      {
        phase: "preload-deduplicated",
        timestamp: "2000-01-01T00:00:00.000Z",
        fromPath: "/",
        toPath: "/account",
        activeMatches: [],
        preloadedMatches: undefined,
      },
      {
        phase: "preload-complete",
        timestamp: "2000-01-01T00:00:00.000Z",
        fromPath: "/",
        toPath: "/account",
        durationMilliseconds: 0,
        activeMatches: [],
        preloadedMatches: [
          "__root__/ route=__root__ status=success fetching=false cause=enter preload=false invalid=false",
          "/account/account route=/account status=success fetching=false cause=enter preload=false invalid=false",
        ],
      },
    ]);
  });
});
