// The one-time consent that lets the image Worker upload as the FactorioBlueprints account.
// See the design doc's "Re-consent runbook".

const authorizeUrl = "https://api.imgur.com/oauth2/authorize";
const tokenUrl = "https://api.imgur.com/oauth2/token";

export interface ImgurAppCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export const buildImgurAuthorizeUrl = (clientId: string): string => {
  const url = new URL(authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  return url.toString();
};

// Imgur redirects to the app's registered URL with ?code=...; accept that URL or the code alone.
export const parseImgurAuthorizationCode = (input: string): string => {
  const trimmed = input.trim();
  if (!/^https?:\/\//.test(trimmed)) return trimmed;
  const code = new URL(trimmed).searchParams.get("code");
  if (!code) throw new Error("no authorization code in that URL");
  return code;
};

export const exchangeImgurAuthorizationCode = async (
  fetch: (url: string, init: RequestInit) => Promise<Response>,
  credentials: ImgurAppCredentials,
  code: string,
): Promise<{ accountUsername: string | null; refreshToken: string }> => {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!response.ok) throw new Error(`Imgur refused the code: ${response.status}`);
  const body = (await response.json()) as { account_username?: unknown; refresh_token?: unknown };
  if (typeof body.refresh_token !== "string") throw new Error("Imgur returned no refresh token");
  return {
    accountUsername: typeof body.account_username === "string" ? body.account_username : null,
    refreshToken: body.refresh_token,
  };
};
