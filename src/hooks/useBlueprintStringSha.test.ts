import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { useBlueprintStringSha } from "./useBlueprintStringSha";

describe("useBlueprintStringSha", () => {
  it("resolves the sha of the blueprint string", async () => {
    const { result } = renderHook(() => useBlueprintStringSha("abc"));

    await waitFor(() => expect(result.current).toBe("a9993e364706816aba3e25717850c26c9cd0d89d"));
  });

  it("stays undefined while there is no blueprint string", async () => {
    const { result } = renderHook(() => useBlueprintStringSha(undefined));

    await waitFor(() => expect(result.current).toBeUndefined());
  });

  it("forgets the previous sha when the blueprint string changes", async () => {
    const { result, rerender } = renderHook(
      ({ blueprintString }: { blueprintString?: string }) => useBlueprintStringSha(blueprintString),
      { initialProps: { blueprintString: "abc" as string | undefined } },
    );

    await waitFor(() => expect(result.current).toBe("a9993e364706816aba3e25717850c26c9cd0d89d"));

    rerender({ blueprintString: undefined });

    expect(result.current).toBeUndefined();
  });
});
