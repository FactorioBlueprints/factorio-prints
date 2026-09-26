import { describe, expect, test } from "vitest";
import {
  findToolchainMismatches,
  readMiseVitePlusPin,
  readWorkspaceVitePlusPins,
} from "../scripts/toolchainAlignmentCore.ts";

const workspaceYaml = (vitePlusCore: string, vitePlus: string) => `onlyBuiltDependencies:
  - esbuild
minimumReleaseAge: 1440
catalog:
  vite: npm:@voidzero-dev/vite-plus-core@${vitePlusCore}
  vitest: 5.0.1
  vite-plus: ${vitePlus}
overrides:
  vite: "catalog:"
  vitest: "catalog:"
peerDependencyRules:
  allowedVersions:
    vite: "*"
`;

const miseToml = (vitePlus: string) => `[tools]
just = "1.56.0"
node = "26.5.1"
"npm:vite-plus" = "${vitePlus}"
pre-commit = "4.6.0"
`;

describe("readWorkspaceVitePlusPins", () => {
  test("reads the vite-plus package and the vite-plus-core alias from the catalog", () => {
    expect(readWorkspaceVitePlusPins(workspaceYaml("0.3.2", "0.3.3"))).toStrictEqual({
      vitePlus: "0.3.3",
      vitePlusCore: "0.3.2",
    });
  });

  test("ignores vite entries outside the catalog block", () => {
    const yaml = `overrides:\n  vite: npm:@voidzero-dev/vite-plus-core@9.9.9\ncatalog:\n  vite-plus: 0.3.3\n`;

    expect(readWorkspaceVitePlusPins(yaml)).toStrictEqual({
      vitePlus: "0.3.3",
      vitePlusCore: null,
    });
  });

  test("accepts quoted catalog versions", () => {
    const yaml = `catalog:\n  vite: "npm:@voidzero-dev/vite-plus-core@0.3.3"\n  vite-plus: "0.3.3"\n`;

    expect(readWorkspaceVitePlusPins(yaml)).toStrictEqual({
      vitePlus: "0.3.3",
      vitePlusCore: "0.3.3",
    });
  });
});

describe("readMiseVitePlusPin", () => {
  test("reads the globally pinned vp CLI version", () => {
    expect(readMiseVitePlusPin(miseToml("0.3.2"))).toBe("0.3.2");
  });

  test("returns null when mise does not pin vite-plus", () => {
    expect(readMiseVitePlusPin(`[tools]\nnode = "26.5.1"\n`)).toBeNull();
  });
});

describe("findToolchainMismatches", () => {
  test("reports nothing when all three pins agree", () => {
    expect(
      findToolchainMismatches({ vitePlus: "0.3.3", vitePlusCore: "0.3.3", miseVitePlus: "0.3.3" }),
    ).toStrictEqual([]);
  });

  test("reports a core alias that lags the vite-plus package", () => {
    expect(
      findToolchainMismatches({ vitePlus: "0.3.3", vitePlusCore: "0.3.2", miseVitePlus: "0.3.3" }),
    ).toStrictEqual([
      "pnpm-workspace.yaml catalog aliases vite to @voidzero-dev/vite-plus-core@0.3.2, but vite-plus is 0.3.3",
    ]);
  });

  test("reports a mise CLI pin that lags the vite-plus package", () => {
    expect(
      findToolchainMismatches({ vitePlus: "0.3.3", vitePlusCore: "0.3.3", miseVitePlus: "0.3.2" }),
    ).toStrictEqual([".mise/config.toml pins npm:vite-plus 0.3.2, but vite-plus is 0.3.3"]);
  });

  test("reports every lagging pin at once", () => {
    expect(
      findToolchainMismatches({ vitePlus: "0.3.3", vitePlusCore: "0.3.2", miseVitePlus: "0.3.2" }),
    ).toStrictEqual([
      "pnpm-workspace.yaml catalog aliases vite to @voidzero-dev/vite-plus-core@0.3.2, but vite-plus is 0.3.3",
      ".mise/config.toml pins npm:vite-plus 0.3.2, but vite-plus is 0.3.3",
    ]);
  });

  test("reports pins that could not be found instead of passing silently", () => {
    expect(
      findToolchainMismatches({ vitePlus: null, vitePlusCore: null, miseVitePlus: null }),
    ).toStrictEqual([
      "pnpm-workspace.yaml catalog has no vite-plus entry",
      "pnpm-workspace.yaml catalog has no vite: npm:@voidzero-dev/vite-plus-core@<version> alias",
      '.mise/config.toml has no "npm:vite-plus" pin',
    ]);
  });
});
