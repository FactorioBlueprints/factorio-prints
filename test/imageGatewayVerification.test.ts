import { verifyImageGateway } from "../scripts/verifyImageGateway";

const origin = "https://images.example.com";

const r2Response = (contentType: string, body: string, etag: string): Response =>
  new Response(body, {
    status: 200,
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": contentType,
      etag,
      "x-content-type-options": "nosniff",
    },
  });

describe("image gateway live verification", () => {
  test("verifies R2 variants, deterministic fallback, and invalid paths", async () => {
    const responses = [
      r2Response("image/png", "original", '"original-etag"'),
      r2Response("image/jpeg", "thumbnail", '"thumbnail-etag"'),
      r2Response("image/jpeg", "large", '"large-etag"'),
      new Response(null, {
        status: 307,
        headers: {
          "cache-control": "public, max-age=300",
          location: "https://i.imgur.com/factorioPrintsGatewayMissing0000000000000000.png",
        },
      }),
      new Response("Image not found", {
        status: 404,
        headers: {
          "cache-control": "no-store",
          "content-type": "text/plain; charset=UTF-8",
        },
      }),
    ];
    const calls: Array<{ init: { method: "GET"; redirect: "manual" }; input: string }> = [];
    const gatewayFetch = async (
      input: string,
      init: { method: "GET"; redirect: "manual" },
    ): Promise<Response> => {
      calls.push({ init, input });
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(verifyImageGateway(origin, gatewayFetch)).resolves.toStrictEqual([
      {
        bodyBytes: 8,
        cacheControl: "public, max-age=31536000, immutable",
        contentType: "image/png",
        etag: '"original-etag"',
        location: null,
        path: "/legacy-imgur/00ez0nx/original.png",
        status: 200,
      },
      {
        bodyBytes: 9,
        cacheControl: "public, max-age=31536000, immutable",
        contentType: "image/jpeg",
        etag: '"thumbnail-etag"',
        location: null,
        path: "/legacy-imgur/00ez0nx/thumbnail.jpeg",
        status: 200,
      },
      {
        bodyBytes: 5,
        cacheControl: "public, max-age=31536000, immutable",
        contentType: "image/jpeg",
        etag: '"large-etag"',
        location: null,
        path: "/legacy-imgur/00ez0nx/large.jpeg",
        status: 200,
      },
      {
        bodyBytes: 0,
        cacheControl: "public, max-age=300",
        contentType: null,
        etag: null,
        location: "https://i.imgur.com/factorioPrintsGatewayMissing0000000000000000.png",
        path: "/legacy-imgur/factorioPrintsGatewayMissing0000000000000000/original.png",
        status: 307,
      },
      {
        bodyBytes: 15,
        cacheControl: "no-store",
        contentType: "text/plain; charset=UTF-8",
        etag: null,
        location: null,
        path: "/legacy-imgur/invalid-id/original.png",
        status: 404,
      },
    ]);
    expect(calls).toStrictEqual([
      {
        init: { method: "GET", redirect: "manual" },
        input: "https://images.example.com/legacy-imgur/00ez0nx/original.png",
      },
      {
        init: { method: "GET", redirect: "manual" },
        input: "https://images.example.com/legacy-imgur/00ez0nx/thumbnail.jpeg",
      },
      {
        init: { method: "GET", redirect: "manual" },
        input: "https://images.example.com/legacy-imgur/00ez0nx/large.jpeg",
      },
      {
        init: { method: "GET", redirect: "manual" },
        input:
          "https://images.example.com/legacy-imgur/factorioPrintsGatewayMissing0000000000000000/original.png",
      },
      {
        init: { method: "GET", redirect: "manual" },
        input: "https://images.example.com/legacy-imgur/invalid-id/original.png",
      },
    ]);
  });

  test("rejects an origin containing a path", async () => {
    await expect(verifyImageGateway("https://images.example.com/gateway")).rejects.toThrow(
      new TypeError("Image gateway must be an HTTP origin without credentials or a path"),
    );
  });

  test("rejects a successful response without an ETag", async () => {
    const gatewayFetch = async (): Promise<Response> =>
      new Response("original", {
        status: 200,
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
          "content-type": "image/png",
          "x-content-type-options": "nosniff",
        },
      });

    await expect(verifyImageGateway(origin, gatewayFetch)).rejects.toThrow(
      new Error("/legacy-imgur/00ez0nx/original.png did not return an ETag"),
    );
  });
});
