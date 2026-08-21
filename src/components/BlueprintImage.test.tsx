import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import BlueprintImage from "./BlueprintImage";

const mocks = vi.hoisted(() => ({
  buildImageUrl: vi.fn(() => "https://images.example.com/legacy-imgur/image-alice/original.png"),
}));

vi.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: () => <span />,
}));

vi.mock("../helpers/buildImageUrl", () => ({
  default: mocks.buildImageUrl,
  ImageVariant: {
    Original: "original",
  },
}));

describe("BlueprintImage", () => {
  it("links the large inline image to the original gateway rendition", () => {
    render(
      <BlueprintImage
        image={{ id: "image-alice", type: "image/png" }}
        thumbnail="https://images.example.com/legacy-imgur/image-alice/large.png"
        isLoading={false}
      />,
    );

    const image = screen.getByRole("img");
    const link = image.closest("a");
    expect({
      buildImageUrlCalls: mocks.buildImageUrl.mock.calls,
      imageSource: image.getAttribute("src"),
      linkHref: link?.getAttribute("href"),
      linkRel: link?.getAttribute("rel"),
      linkTarget: link?.getAttribute("target"),
    }).toStrictEqual({
      buildImageUrlCalls: [["image-alice", "image/png", "original"]],
      imageSource: "https://images.example.com/legacy-imgur/image-alice/large.png",
      linkHref: "https://images.example.com/legacy-imgur/image-alice/original.png",
      linkRel: "noopener noreferrer",
      linkTarget: "_blank",
    });
  });
});
