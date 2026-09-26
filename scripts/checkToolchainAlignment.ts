import { readFile } from "node:fs/promises";
import {
  findToolchainMismatches,
  readMiseVitePlusPin,
  readWorkspaceVitePlusPins,
} from "./toolchainAlignmentCore.ts";

const [workspaceYaml, miseToml] = await Promise.all([
  readFile("pnpm-workspace.yaml", "utf8"),
  readFile(".mise/config.toml", "utf8"),
]);

const pins = {
  ...readWorkspaceVitePlusPins(workspaceYaml),
  miseVitePlus: readMiseVitePlusPin(miseToml),
};
const problems = findToolchainMismatches(pins);

if (problems.length === 0) {
  console.log(`vite-plus toolchain pins agree on ${pins.vitePlus}`);
} else {
  for (const problem of problems) console.error(`error: ${problem}`);
  console.error(
    "Update all three pins to the same version, then run `vp install` and `mise install`.",
  );
  process.exitCode = 1;
}
