import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import ImageUpload from "./ImageUpload";

vi.mock("../helpers/buildImageUrl", () => ({
  default: (id: string, type: string, variant: string) =>
    `https://images.example.com/${id}/${variant}/${type}`,
  ImageVariant: { Thumbnail: "thumbnail" },
}));

const png = () => new File([new Uint8Array([1, 2, 3])], "screenshot.png", { type: "image/png" });

describe("ImageUpload", () => {
  it("uploads a chosen file and reports the stored image", async () => {
    const upload = vi.fn(async () => ({ id: "AbCdE12", type: "image/png" }));
    const onUploaded = vi.fn();
    render(<ImageUpload image={null} onUploaded={onUploaded} upload={upload} />);
    const file = png();

    fireEvent.change(screen.getByLabelText("Choose an image"), { target: { files: [file] } });

    await waitFor(() =>
      expect(onUploaded).toHaveBeenCalledWith({ id: "AbCdE12", type: "image/png" }),
    );
    expect(upload).toHaveBeenCalledWith(file);
  });

  it("uploads a dropped file", async () => {
    const upload = vi.fn(async () => ({ id: "AbCdE12", type: "image/png" }));
    render(<ImageUpload image={null} onUploaded={vi.fn()} upload={upload} />);
    const file = png();

    fireEvent.drop(screen.getByTestId("image-drop-zone"), { dataTransfer: { files: [file] } });

    await waitFor(() => expect(upload).toHaveBeenCalledWith(file));
  });

  it("uploads a pasted image", async () => {
    const upload = vi.fn(async () => ({ id: "AbCdE12", type: "image/png" }));
    render(<ImageUpload image={null} onUploaded={vi.fn()} upload={upload} />);
    const file = png();

    fireEvent.paste(screen.getByTestId("image-drop-zone"), { clipboardData: { files: [file] } });

    await waitFor(() => expect(upload).toHaveBeenCalledWith(file));
  });

  it("shows why an upload failed and reports nothing", async () => {
    const onUploaded = vi.fn();
    const upload = vi.fn(async () => {
      throw new Error("You have reached the limit of 10 uploads an hour. Try again later.");
    });
    render(<ImageUpload image={null} onUploaded={onUploaded} upload={upload} />);

    fireEvent.change(screen.getByLabelText("Choose an image"), { target: { files: [png()] } });

    expect(
      await screen.findByText("You have reached the limit of 10 uploads an hour. Try again later."),
    ).toBeTruthy();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("does not warn the author about the upload expiry", () => {
    render(<ImageUpload image={null} onUploaded={vi.fn()} upload={vi.fn()} />);

    expect(screen.queryByText(/within an hour/)).toBeNull();
  });

  it("previews an uploaded image through the gateway", () => {
    render(
      <ImageUpload
        image={{ id: "AbCdE12", type: "image/png" }}
        onUploaded={vi.fn()}
        upload={vi.fn()}
      />,
    );

    expect(screen.getByAltText("New screenshot").getAttribute("src")).toBe(
      "https://images.example.com/AbCdE12/thumbnail/image/png",
    );
  });
});
