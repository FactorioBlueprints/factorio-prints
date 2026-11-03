import {readFile} from "node:fs/promises";
import {findToolchainMismatches, readWorkspaceVitePlusPins} from "./toolchainAlignmentCore.ts";

const pins = readWorkspaceVitePlusPins(await readFile("pnpm-workspace.yaml", "utf8"));
const problems = findToolchainMismatches(pins);

if (problems.length === 0) {
	console.log(`vite-plus toolchain pins agree on ${pins.vitePlus}`);
} else {
	for (const problem of problems) console.error(`error: ${problem}`);
	console.error("Update the vite-plus and vite-plus-core catalog pins to the same version, then run `vp install`.");
	process.exitCode = 1;
}
