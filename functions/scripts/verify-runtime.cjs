const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const functionsPackageEntry = require.resolve("firebase-functions");
const functionsPackageDirectory = resolve(dirname(functionsPackageEntry), "..", "..");
const functionsRuntimeBinary = join(
  functionsPackageDirectory,
  "lib",
  "bin",
  "firebase-functions.js",
);
const manifestDirectory = mkdtempSync(join(process.cwd(), ".firebase-functions-manifest-"));
const manifestPath = join(manifestDirectory, "functions.json");
const firebaseConfigurationPath = resolve(process.cwd(), "..", ".firebaserc");
const firebaseConfiguration = JSON.parse(readFileSync(firebaseConfigurationPath, "utf8"));
const projectId = firebaseConfiguration.projects?.default;

if (typeof projectId !== "string" || projectId.length === 0) {
  throw new Error("Firebase configuration must define a default project ID");
}

try {
  execFileSync(process.execPath, [functionsRuntimeBinary, "."], {
    env: {
      ...process.env,
      FUNCTIONS_MANIFEST_OUTPUT_PATH: manifestPath,
      GCLOUD_PROJECT: projectId,
    },
    stdio: "inherit",
  });

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (Object.keys(manifest.endpoints).length === 0) {
    throw new Error("Firebase Functions manifest contains no endpoints");
  }
} finally {
  rmSync(manifestDirectory, { force: true, recursive: true });
}
