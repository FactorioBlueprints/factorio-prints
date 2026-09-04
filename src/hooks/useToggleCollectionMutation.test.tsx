import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { Database, DatabaseReference } from "firebase/database";
import { update as dbUpdate, ref } from "firebase/database";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { getFirebaseDatabase } from "../utils/firebaseDatabase";
import { useToggleCollectionMutation } from "./useToggleCollectionMutation";

vi.mock("firebase/database", () => ({
  ref: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../utils/firebaseDatabase", () => ({
  getFirebaseDatabase: vi.fn(),
}));

vi.mock("../base", () => ({
  app: {},
}));

describe("useToggleCollectionMutation", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element;
  let mockDatabase: Database;
  let mockRef: DatabaseReference;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    mockDatabase = {} as Database;
    mockRef = {} as DatabaseReference;
    vi.mocked(getFirebaseDatabase).mockReturnValue(mockDatabase);
    vi.mocked(ref).mockReturnValue(mockRef);
    vi.mocked(dbUpdate).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adds a blueprint to collection", async () => {
    const { result } = renderHook(() => useToggleCollectionMutation(), { wrapper });

    result.current.mutate({
      blueprintId: "blueprint123",
      userId: "user456",
      isInCollection: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(dbUpdate)).toHaveBeenCalledWith(mockRef, {
      "/users/user456/collection/blueprint123": true,
      "/blueprintCollectors/blueprint123/user456": true,
    });
  });

  it("removes a blueprint from collection", async () => {
    const { result } = renderHook(() => useToggleCollectionMutation(), { wrapper });

    result.current.mutate({
      blueprintId: "blueprint123",
      userId: "user456",
      isInCollection: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(dbUpdate)).toHaveBeenCalledWith(mockRef, {
      "/users/user456/collection/blueprint123": null,
      "/blueprintCollectors/blueprint123/user456": null,
    });
  });

  it("updates collection cache after toggle", async () => {
    queryClient.setQueryData(["users", "userId", "user456", "collection"], {
      existing: true,
    });

    const { result } = renderHook(() => useToggleCollectionMutation(), { wrapper });

    result.current.mutate({
      blueprintId: "blueprint123",
      userId: "user456",
      isInCollection: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(["users", "userId", "user456", "collection"])).toEqual({
      existing: true,
      blueprint123: true,
    });

    expect(
      queryClient.getQueryData([
        "users",
        "userId",
        "user456",
        "collection",
        "blueprintId",
        "blueprint123",
      ]),
    ).toBe(true);
  });
});
