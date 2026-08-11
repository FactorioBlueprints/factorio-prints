import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useCopyToClipboard } from "./useCopyToClipboard";

const setClipboard = (writeText?: (text: string) => Promise<void>) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
};

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reports a successful clipboard write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setClipboard(writeText);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copyToClipboard("blueprint-string"));

    expect({
      copiedText: result.current.copiedText,
      copyError: result.current.copyError,
      writeTextCalls: writeText.mock.calls,
      consoleWarnCalls: consoleWarn.mock.calls,
      consoleErrorCalls: consoleError.mock.calls,
    }).toStrictEqual({
      copiedText: true,
      copyError: "",
      writeTextCalls: [["blueprint-string"]],
      consoleWarnCalls: [],
      consoleErrorCalls: [],
    });
  });

  it("treats a denied clipboard permission as an expected failure", async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new DOMException("Write permission denied", "NotAllowedError"));
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setClipboard(writeText);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copyToClipboard("blueprint-string"));

    expect({
      copiedText: result.current.copiedText,
      copyError: result.current.copyError,
      writeTextCalls: writeText.mock.calls,
      consoleWarnCalls: consoleWarn.mock.calls,
      consoleErrorCalls: consoleError.mock.calls,
    }).toStrictEqual({
      copiedText: false,
      copyError: "Clipboard permission was denied. Allow clipboard access and try again.",
      writeTextCalls: [["blueprint-string"]],
      consoleWarnCalls: [],
      consoleErrorCalls: [],
    });
  });

  it("reports unavailable clipboard access without attempting a write", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setClipboard();
    const { result } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copyToClipboard("blueprint-string"));

    expect({
      copiedText: result.current.copiedText,
      copyError: result.current.copyError,
      consoleWarnCalls: consoleWarn.mock.calls,
      consoleErrorCalls: consoleError.mock.calls,
    }).toStrictEqual({
      copiedText: false,
      copyError: "Clipboard access is unavailable in this browser or session.",
      consoleWarnCalls: [],
      consoleErrorCalls: [],
    });
  });

  it("reports an unexpected rejected clipboard write without console capture", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard device disconnected"));
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setClipboard(writeText);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copyToClipboard("blueprint-string"));

    expect({
      copiedText: result.current.copiedText,
      copyError: result.current.copyError,
      writeTextCalls: writeText.mock.calls,
      consoleWarnCalls: consoleWarn.mock.calls,
      consoleErrorCalls: consoleError.mock.calls,
    }).toStrictEqual({
      copiedText: false,
      copyError: "Failed to copy to the clipboard. Please try again.",
      writeTextCalls: [["blueprint-string"]],
      consoleWarnCalls: [],
      consoleErrorCalls: [],
    });
  });
});
