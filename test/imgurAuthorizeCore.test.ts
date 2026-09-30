import {
  buildImgurAuthorizeUrl,
  exchangeImgurAuthorizationCode,
  parseImgurAuthorizationCode,
} from "../scripts/imgurAuthorizeCore";

describe("Imgur authorization", () => {
  test("builds the consent URL for an authorization code", () => {
    const url = new URL(buildImgurAuthorizeUrl("client-id"));

    expect(url.origin + url.pathname).toBe("https://api.imgur.com/oauth2/authorize");
    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      client_id: "client-id",
      response_type: "code",
    });
  });

  test("accepts either the bare code or the whole redirect URL", () => {
    expect(parseImgurAuthorizationCode("abc123")).toBe("abc123");
    expect(
      parseImgurAuthorizationCode("https://factorioprints.com/imgur?code=abc123&state=x"),
    ).toBe("abc123");
    expect(() =>
      parseImgurAuthorizationCode("https://factorioprints.com/imgur?error=access_denied"),
    ).toThrow("no authorization code in that URL");
  });

  test("exchanges the code for the account's refresh token", async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({
        access_token: "access",
        refresh_token: "refresh",
        account_username: "FactorioBlueprints",
      }),
    );

    const result = await exchangeImgurAuthorizationCode(
      fetch,
      { clientId: "client-id", clientSecret: "client-secret" },
      "abc123",
    );

    expect(result).toStrictEqual({
      accountUsername: "FactorioBlueprints",
      refreshToken: "refresh",
    });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.imgur.com/oauth2/token");
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toStrictEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      code: "abc123",
      grant_type: "authorization_code",
    });
  });

  test("reports a refused exchange", async () => {
    const fetch = vi.fn(async () => Response.json({ error: "invalid_grant" }, { status: 400 }));

    await expect(
      exchangeImgurAuthorizationCode(fetch, { clientId: "id", clientSecret: "secret" }, "stale"),
    ).rejects.toThrow("Imgur refused the code: 400");
  });
});
