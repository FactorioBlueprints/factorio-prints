import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UseNavigateResult } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { renderHook } from "@testing-library/react";
import type { User } from "firebase/auth";
import { update as dbUpdate, push, ref } from "firebase/database";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useCreateBlueprint } from "./useCreateBlueprint";

vi.mock("firebase/database", () => ({
  getDatabase: vi.fn(),
  ref: vi.fn(),
  push: vi.fn(),
  update: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
}));

vi.mock("../base", () => ({
  app: {},
}));

describe("useCreateBlueprint", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => React.ReactNode;
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    navigateMock = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigateMock as unknown as UseNavigateResult<string>);
  });

  it("should create blueprint with raw data", async () => {
    const mockRef = {};
    const mockNewBlueprintRef = { key: "newBlueprint123" };
    vi.mocked(ref).mockReturnValue(mockRef as any);
    vi.mocked(push).mockReturnValue(mockNewBlueprintRef as any);
    vi.mocked(dbUpdate).mockResolvedValue();

    const formData = {
      title: "Test Blueprint",
      blueprintString: "test blueprint string",
      descriptionMarkdown: "test description",
      tags: ["tag1", "tag2"],
      image: { id: "abc1234", type: "image/png" },
    };

    const user = {
      uid: "user123",
      displayName: "Test User",
    } as Partial<User> as User;

    const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

    await result.current.mutateAsync({
      formData,
      user,
    });

    expect(push).toHaveBeenCalledWith(mockRef, {
      title: "Test Blueprint",
      blueprintString: "test blueprint string",
      descriptionMarkdown: "test description",
      tags: ["tag1", "tag2"],
      author: {
        userId: "user123",
        displayName: "Test User",
      },
      createdDate: "SERVER_TIMESTAMP",
      lastUpdatedDate: "SERVER_TIMESTAMP",
      favorites: {},
      numberOfFavorites: 0,
      image: {
        id: "abc1234",
        type: "image/png",
      },
    });

    expect(dbUpdate).toHaveBeenCalledWith(mockRef, {
      "/users/user123/blueprints/newBlueprint123": true,
      "/users/user123/collection/newBlueprint123": true,
      "/blueprintSummaries/newBlueprint123": {
        imgurId: "abc1234",
        imgurType: "image/png",
        title: "Test Blueprint",
        numberOfFavorites: 0,
        lastUpdatedDate: "SERVER_TIMESTAMP",
      },
      "/blueprintsPrivate/newBlueprint123/imageUrl": "https://imgur.com/abc1234",
      "/byTag/tag1/newBlueprint123": true,
      "/byTag/tag2/newBlueprint123": true,
    });

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/user/$userId",
      params: { userId: "user123" },
      from: "/create",
    });
  });

  it("records the content type the upload reported", async () => {
    const mockRef = {};
    const mockNewBlueprintRef = { key: "newBlueprint123" };
    vi.mocked(ref).mockReturnValue(mockRef as any);
    vi.mocked(push).mockReturnValue(mockNewBlueprintRef as any);
    vi.mocked(dbUpdate).mockResolvedValue();

    const formData = {
      title: "Test Blueprint",
      blueprintString: "test blueprint string",
      descriptionMarkdown: "test description",
      tags: [],
      image: { id: "xyz5678", type: "image/jpeg" },
    };

    const user = {
      uid: "user123",
      displayName: null,
    } as Partial<User> as User;

    const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

    await result.current.mutateAsync({
      formData,
      user,
    });

    expect(push).toHaveBeenCalledWith(
      mockRef,
      expect.objectContaining({
        image: {
          id: "xyz5678",
          type: "image/jpeg",
        },
      }),
    );
    expect(dbUpdate).toHaveBeenCalledWith(
      mockRef,
      expect.objectContaining({
        "/blueprintSummaries/newBlueprint123": expect.objectContaining({
          imgurId: "xyz5678",
          imgurType: "image/jpeg",
        }),
      }),
    );
  });

  it("records the gateway URL for an image only R2 holds", async () => {
    const mockRef = {};
    vi.mocked(ref).mockReturnValue(mockRef as any);
    vi.mocked(push).mockReturnValue({ key: "newBlueprint123" } as any);
    vi.mocked(dbUpdate).mockResolvedValue();

    const formData = {
      title: "Test Blueprint",
      blueprintString: "test blueprint string",
      descriptionMarkdown: "test description",
      tags: [],
      image: { id: "Fallback0123456789Ab", type: "image/png" },
    };

    const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

    await result.current.mutateAsync({
      formData,
      user: { uid: "user123" } as Partial<User> as User,
    });

    expect(dbUpdate).toHaveBeenCalledWith(
      mockRef,
      expect.objectContaining({
        "/blueprintsPrivate/newBlueprint123/imageUrl": expect.stringMatching(
          /\/legacy-imgur\/Fallback0123456789Ab\/original\.png$/,
        ),
      }),
    );
  });

  it("should update cache on success", async () => {
    const mockRef = {};
    const mockNewBlueprintRef = { key: "newBlueprint123" };
    vi.mocked(ref).mockReturnValue(mockRef as any);
    vi.mocked(push).mockReturnValue(mockNewBlueprintRef as any);
    vi.mocked(dbUpdate).mockResolvedValue();

    const existingPaginatedData = {
      pages: [
        {
          data: {
            existing1: {
              title: "Existing 1",
              lastUpdatedDate: 1000000,
              imgurId: "exist1",
              imgurType: "image/png",
              numberOfFavorites: 5,
            },
          },
          lastKey: "existing1",
          lastValue: 1000000,
          hasMore: false,
        },
      ],
    };

    queryClient.setQueryData(
      ["blueprintSummaries", "orderByField", "lastUpdatedDate"],
      existingPaginatedData,
    );

    const formData = {
      title: "New Blueprint",
      blueprintString: "new blueprint string",
      descriptionMarkdown: "new description",
      tags: ["newTag"],
      image: { id: "new1234", type: "image/png" },
    };

    const user = {
      uid: "user123",
    } as Partial<User> as User;

    const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

    await result.current.mutateAsync({
      formData,
      user,
    });

    const summaryData = queryClient.getQueryData([
      "blueprintSummaries",
      "blueprintId",
      "newBlueprint123",
    ]);
    expect(summaryData).toEqual({
      title: "New Blueprint",
      imgurId: "new1234",
      imgurType: "image/png",
      numberOfFavorites: 0,
      lastUpdatedDate: expect.any(Number),
    });

    const paginatedData = queryClient.getQueryData([
      "blueprintSummaries",
      "orderByField",
      "lastUpdatedDate",
    ]) as any;
    expect(paginatedData.pages[0].data).toHaveProperty("newBlueprint123");
  });

  it("should update user blueprints cache", async () => {
    const mockRef = {};
    const mockNewBlueprintRef = { key: "newBlueprint123" };
    vi.mocked(ref).mockReturnValue(mockRef as any);
    vi.mocked(push).mockReturnValue(mockNewBlueprintRef as any);
    vi.mocked(dbUpdate).mockResolvedValue();

    queryClient.setQueryData(["users", "userId", "user123", "blueprints"], {
      existing1: true,
      existing2: true,
    });

    const formData = {
      title: "Test Blueprint",
      blueprintString: "test blueprint string",
      descriptionMarkdown: "test description",
      tags: [],
      image: { id: "abc1234", type: "image/png" },
    };

    const user = {
      uid: "user123",
    } as Partial<User> as User;

    const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

    await result.current.mutateAsync({
      formData,
      user,
    });

    const userBlueprints = queryClient.getQueryData(["users", "userId", "user123", "blueprints"]);
    expect(userBlueprints).toEqual({
      existing1: true,
      existing2: true,
      newBlueprint123: true,
    });
  });

  it("should update user collection cache", async () => {
    const mockRef = {};
    const mockNewBlueprintRef = { key: "newBlueprint123" };
    vi.mocked(ref).mockReturnValue(mockRef as any);
    vi.mocked(push).mockReturnValue(mockNewBlueprintRef as any);
    vi.mocked(dbUpdate).mockResolvedValue();

    queryClient.setQueryData(["users", "userId", "user123", "collection"], {
      existing1: true,
    });

    const formData = {
      title: "Test Blueprint",
      blueprintString: "test blueprint string",
      descriptionMarkdown: "test description",
      tags: [],
      image: { id: "abc1234", type: "image/png" },
    };

    const user = {
      uid: "user123",
    } as Partial<User> as User;

    const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

    await result.current.mutateAsync({
      formData,
      user,
    });

    const userCollection = queryClient.getQueryData(["users", "userId", "user123", "collection"]);
    expect(userCollection).toEqual({
      existing1: true,
      newBlueprint123: true,
    });
  });

  it("should update tag cache", async () => {
    const mockRef = {};
    const mockNewBlueprintRef = { key: "newBlueprint123" };
    vi.mocked(ref).mockReturnValue(mockRef as any);
    vi.mocked(push).mockReturnValue(mockNewBlueprintRef as any);
    vi.mocked(dbUpdate).mockResolvedValue();

    queryClient.setQueryData(["tags"], ["tag1", "tag2", "tag3"]);
    queryClient.setQueryData(["byTag", "tag1"], { existing1: true });
    queryClient.setQueryData(["byTag", "tag2"], { existing2: true });

    const formData = {
      title: "Test Blueprint",
      blueprintString: "test blueprint string",
      descriptionMarkdown: "test description",
      tags: ["tag1", "tag3"],
      image: { id: "abc1234", type: "image/png" },
    };

    const user = {
      uid: "user123",
    } as Partial<User> as User;

    const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

    await result.current.mutateAsync({
      formData,
      user,
    });

    const tag1Data = queryClient.getQueryData(["byTag", "tag1"]);
    expect(tag1Data).toEqual({ existing1: true, newBlueprint123: true });

    const tag2Data = queryClient.getQueryData(["byTag", "tag2"]);
    expect(tag2Data).toEqual({ existing2: true });
  });
});
