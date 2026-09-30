import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  buildImgurAuthorizeUrl,
  exchangeImgurAuthorizationCode,
  parseImgurAuthorizationCode,
} from "./imgurAuthorizeCore.ts";

// Step 1: node scripts/imgurAuthorize.ts
//   prints the consent URL; open it signed in as FactorioBlueprints and allow.
// Step 2: node scripts/imgurAuthorize.ts --code '<code or redirect URL>' \
//           | wrangler secret put IMGUR_REFRESH_TOKEN --config workers/images/wrangler.jsonc --env preview
//   prints only the refresh token on stdout, so it goes straight into the Worker secret.
// Credentials come from the environment, for example through `op run`.

const environmentSchema = z.object({
  IMGUR_CLIENT_ID: z.string().min(1),
  IMGUR_CLIENT_SECRET: z.string().min(1),
});

const main = async (): Promise<void> => {
  const { values } = parseArgs({ options: { code: { type: "string" } } });
  const environment = environmentSchema.parse(process.env);

  if (!values.code) {
    console.error("Open this URL signed in as FactorioBlueprints, allow, then rerun with --code:");
    console.error(buildImgurAuthorizeUrl(environment.IMGUR_CLIENT_ID));
    return;
  }

  const { accountUsername, refreshToken } = await exchangeImgurAuthorizationCode(
    (url, init) => fetch(url, init),
    { clientId: environment.IMGUR_CLIENT_ID, clientSecret: environment.IMGUR_CLIENT_SECRET },
    parseImgurAuthorizationCode(values.code),
  );
  console.error(`Authorized Imgur account: ${accountUsername ?? "unknown"}`);
  process.stdout.write(refreshToken);
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedModuleUrl) {
  await main();
}
