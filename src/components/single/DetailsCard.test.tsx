import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { DetailsCard } from "./DetailsCard";

vi.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: () => <span />,
}));

vi.mock("../BlueprintMarkdownDescription", () => ({
  default: () => <p>Blueprint description</p>,
}));

describe("DetailsCard clipboard feedback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows clipboard permission denial without writing to the console", async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new DOMException("Write permission denied", "NotAllowedError"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DetailsCard blueprintString="blueprint-string" isLoading={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy to Clipboard" }));

    const alert = await screen.findByRole("alert");
    expect({
      alertText: alert.textContent,
      writeTextCalls: writeText.mock.calls,
      consoleWarnCalls: consoleWarn.mock.calls,
      consoleErrorCalls: consoleError.mock.calls,
    }).toStrictEqual({
      alertText: "Clipboard permission was denied. Allow clipboard access and try again.",
      writeTextCalls: [["blueprint-string"]],
      consoleWarnCalls: [],
      consoleErrorCalls: [],
    });
  });
});
