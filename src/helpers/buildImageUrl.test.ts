import { describe, expect, it } from "vite-plus/test";
import buildImageUrl, { ImageVariant, resolveImageGatewayOrigin } from "./buildImageUrl";

describe("resolveImageGatewayOrigin", () => {
  it("uses configured, local-development, production, and explicit same-origin gateways", () => {
    expect([
      resolveImageGatewayOrigin({
        DEV: false,
        VITE_IMAGE_GATEWAY_ORIGIN: "https://images.example.com/",
      }),
      resolveImageGatewayOrigin({ DEV: true }),
      resolveImageGatewayOrigin({ DEV: false }),
      resolveImageGatewayOrigin({ DEV: true, VITE_IMAGE_GATEWAY_ORIGIN: "" }),
    ]).toStrictEqual([
      "https://images.example.com",
      "http://localhost:8787",
      "https://images.factorioprints.com",
      "",
    ]);
  });

  it.each(["ftp://images.example.com", "https://images.example.com/prefix"])(
    "rejects invalid gateway origin %s",
    (VITE_IMAGE_GATEWAY_ORIGIN) => {
      expect(() => resolveImageGatewayOrigin({ DEV: false, VITE_IMAGE_GATEWAY_ORIGIN })).toThrow(
        new TypeError("VITE_IMAGE_GATEWAY_ORIGIN must contain only an HTTP origin"),
      );
    },
  );
});

describe("buildImageUrl", () => {
  it("builds the gateway contract for every image variant and supported extension", () => {
    const gatewayOrigin = "https://images.example.com";

    expect([
      buildImageUrl("alice100", "image/png", ImageVariant.Original, gatewayOrigin),
      buildImageUrl("alice100", "image/jpeg", ImageVariant.Thumbnail, gatewayOrigin),
      buildImageUrl("alice100", "image/jpg", ImageVariant.Large, gatewayOrigin),
      buildImageUrl("alice100", "image/gif", ImageVariant.Original, gatewayOrigin),
    ]).toStrictEqual([
      "https://images.example.com/legacy-imgur/alice100/original.png",
      "https://images.example.com/legacy-imgur/alice100/thumbnail.jpeg",
      "https://images.example.com/legacy-imgur/alice100/large.jpg",
      "https://images.example.com/legacy-imgur/alice100/original.gif",
    ]);
  });

  it("preserves placeholder and legacy PNG defaults", () => {
    expect([
      buildImageUrl("", "image/png", ImageVariant.Thumbnail, ""),
      buildImageUrl("alice100", "", ImageVariant.Thumbnail, ""),
      buildImageUrl("alice100", "image/webp", ImageVariant.Large, ""),
    ]).toStrictEqual([
      "/icons/entity-unknown.png",
      "/legacy-imgur/alice100/thumbnail.png",
      "/legacy-imgur/alice100/large.png",
    ]);
  });
});
