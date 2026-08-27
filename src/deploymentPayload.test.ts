import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import {
  createViteConfiguration,
  getReleaseVersion,
  hasSentryUploadCredentials,
} from "../vite.config";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("deployment payload", () => {
  it("bundles the Slate theme without legacy stylesheet CDNs", () => {
    const document = readProjectFile("index.html");
    const entrypoint = readProjectFile("src/main.tsx");

    expect(document).not.toContain("use.fontawesome.com");
    expect(document).not.toContain("cdnjs.cloudflare.com/ajax/libs/bootswatch");
    expect(entrypoint).toContain('import "bootswatch/dist/slate/bootstrap.min.css";');
  });

  it("ships only locally referenced icons", () => {
    const icons = readdirSync(resolve(process.cwd(), "public/icons")).sort();

    expect(icons).toStrictEqual(["entity-unknown.png", "fbe.png"]);
    expect(readProjectFile("src/helpers/buildImageUrl.ts")).toContain("/icons/entity-unknown.png");
    expect(readProjectFile("src/components/BlueprintThumbnail.tsx")).toContain(
      "/icons/entity-unknown.png",
    );
    expect(readProjectFile("src/components/single/BlueprintContentHeader.tsx")).toContain(
      "/icons/fbe.png",
    );
  });

  it("generates uploadable source maps only with complete Sentry credentials", () => {
    const sentryEnvironment = {
      SENTRY_AUTH_TOKEN: "token",
      SENTRY_ORG: "organization",
      SENTRY_PROJECT: "project",
    };
    const noCredentialsConfiguration = createViteConfiguration({});
    const sentryUploadConfiguration = createViteConfiguration(sentryEnvironment);

    expect({
      noCredentials: {
        hasCredentials: hasSentryUploadCredentials({}),
        pluginCount: noCredentialsConfiguration.plugins?.length,
        sourceMaps: noCredentialsConfiguration.build?.sourcemap,
      },
      partialCredentials: hasSentryUploadCredentials({ SENTRY_AUTH_TOKEN: "token" }),
      sentryUpload: {
        hasCredentials: hasSentryUploadCredentials(sentryEnvironment),
        pluginCount: sentryUploadConfiguration.plugins?.length,
        sourceMaps: sentryUploadConfiguration.build?.sourcemap,
      },
    }).toStrictEqual({
      noCredentials: {
        hasCredentials: false,
        pluginCount: 2,
        sourceMaps: false,
      },
      partialCredentials: false,
      sentryUpload: {
        hasCredentials: true,
        pluginCount: 3,
        sourceMaps: true,
      },
    });
    expect(readProjectFile("vite.config.ts")).toContain(
      'filesToDeleteAfterUpload: ["./dist/**/*.map"]',
    );
  });

  it("uses the deployment commit as the release version", () => {
    expect(
      getReleaseVersion({
        SENTRY_RELEASE: "0000000000000000000000000000000000000000",
      }),
    ).toBe("0000000000000000000000000000000000000000");
  });
});
