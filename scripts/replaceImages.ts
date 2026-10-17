import { readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { type BrowserContext, chromium, type Page } from "playwright-core";
import {
  auditReplacement,
  buildReplacementQueue,
  emptyReplacementLedger,
  gatewayImageUrl,
  parseUploadResponse,
  replacementCandidatesSchema,
  replacementDecisionsSchema,
  type ReplacementLedger,
  replacementLedgerSchema,
  ReplacementStatus,
  runReplacementLoop,
  type SaveOutcome,
  type UploadRecord,
  type UploadState,
  uploadPlanSchema,
} from "./imageReplacementCore.ts";

// Applies a reviewed screenshot-replacement round from a round directory holding
// decisions.json, candidates.json and upload-plan.json (plus an optional hold-keys.txt).
//
//   node scripts/replaceImages.ts --round <dir> --login       sign in to Factorio Prints once
//   node scripts/replaceImages.ts --round <dir>               dry run: show what would happen
//   node scripts/replaceImages.ts --round <dir> --execute     upload, save, then audit
//   node scripts/replaceImages.ts --round <dir> --audit-only  audit what earlier runs saved
//
// Each replacement goes through the blueprint's own edit form: the file is dropped on its upload
// zone, which sends it to the image Worker (R2 plus Imgur), and the form is saved straight away.
// The Worker allows 10 uploads per user per UTC hour and deletes an upload no blueprint uses
// within an hour, so the run paces itself and never leaves an upload waiting for a later save.
//
// Progress lives in <dir>/replacement-ledger.json, so rerunning resumes where the last run stopped.

const databaseUrl = "https://facorio-blueprints.firebaseio.com";
const siteOrigin = "https://factorioprints.com";
const gatewayOrigin = "https://images.factorioprints.com";
const uploadUrl = `${gatewayOrigin}/uploads`;

interface CommandOptions {
  audit: boolean;
  execute: boolean;
  limit?: number;
  login: boolean;
  profile: string;
  round: string;
}

const parseCommandOptions = (): CommandOptions => {
  const { values } = parseArgs({
    options: {
      "audit-only": { default: false, type: "boolean" },
      execute: { default: false, type: "boolean" },
      limit: { type: "string" },
      login: { default: false, type: "boolean" },
      profile: {
        default: join(homedir(), ".cache", "factorio-prints-image-replacement", "profile"),
        type: "string",
      },
      round: { type: "string" },
    },
  });
  if (!values.round) throw new Error("--round <directory> is required");
  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }
  return {
    audit: values["audit-only"],
    execute: values.execute,
    limit,
    login: values.login,
    profile: resolve(values.profile),
    round: resolve(values.round),
  };
};

const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));

const readOptional = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};

const writeJsonAtomically = async (path: string, value: unknown): Promise<void> => {
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, path);
};

const loadRound = async (round: string) => {
  const ledgerText = await readOptional(join(round, "replacement-ledger.json"));
  const holdText = await readOptional(join(round, "hold-keys.txt"));
  return {
    candidates: replacementCandidatesSchema.parse(await readJson(join(round, "candidates.json"))),
    decisions: replacementDecisionsSchema.parse(await readJson(join(round, "decisions.json"))),
    holdKeys: (holdText ?? "").split(/\s+/).filter(Boolean),
    ledger: ledgerText
      ? replacementLedgerSchema.parse(JSON.parse(ledgerText))
      : emptyReplacementLedger(),
    uploadPlan: uploadPlanSchema.parse(await readJson(join(round, "upload-plan.json"))),
  };
};

const openBrowser = (profile: string): Promise<BrowserContext> =>
  chromium.launchPersistentContext(profile, { channel: "chrome", headless: false, viewport: null });

const dropZone = (page: Page) => page.locator('[data-testid="image-drop-zone"]');

const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-origin": siteOrigin,
};

// Answers the form's upload request with an earlier, still-unexpired upload, so a resumed save
// attaches the same image without spending another upload from the hourly quota.
const answerUploadsWith = (page: Page, reuse: UploadRecord) =>
  page.route(uploadUrl, (route) =>
    route.request().method() === "OPTIONS"
      ? route.fulfill({ headers: corsHeaders, status: 204 })
      : route.fulfill({
          body: JSON.stringify({ id: reuse.imageId, type: reuse.type }),
          headers: { ...corsHeaders, "content-type": "application/json" },
          status: 201,
        }),
  );

const uploadThroughEditForm = async (
  page: Page,
  key: string,
  file: string,
  reuse?: UploadRecord,
): Promise<UploadState> => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
  if (reuse) await answerUploadsWith(page, reuse);
  await page.goto(`${siteOrigin}/edit/${key}`, { waitUntil: "domcontentloaded" });
  try {
    await dropZone(page).waitFor({ timeout: 45_000 });
  } catch {
    const signedOut = await page
      .getByText(/sign in/i)
      .first()
      .isVisible()
      .catch(() => false);
    return {
      kind: "ambiguous",
      reason: signedOut
        ? "not signed in to Factorio Prints; run with --login first"
        : "no image upload on the edit page",
    };
  }

  const responded = page.waitForResponse(
    (response) => response.url() === uploadUrl && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await dropZone(page).locator('input[type="file"]').setInputFiles(file);
  let state: UploadState;
  try {
    const response = await responded;
    state = parseUploadResponse({
      body: await response.text(),
      retryAfter: (await response.headerValue("retry-after")) ?? null,
      status: response.status(),
    });
  } catch {
    // The form checks type and size before sending, and shows why it refused.
    const refused = await page
      .locator(".text-danger")
      .first()
      .textContent({ timeout: 1_000 })
      .catch(() => null);
    return refused
      ? { kind: "failed", reason: `the form refused the file: ${refused}` }
      : { kind: "ambiguous", reason: "the form never sent the upload" };
  }
  if (state.kind !== "uploaded") return state;

  const preview = page.locator(`img[alt="New screenshot"][src*="/${state.imageId}/"]`);
  try {
    await preview.waitFor({ timeout: 30_000 });
  } catch {
    return { kind: "ambiguous", reason: `uploaded ${state.imageId} but the form shows no preview` };
  }
  return state;
};

const saveEditForm = async (page: Page, key: string, imageId: string): Promise<SaveOutcome> => {
  try {
    if (!(await page.locator(`img[alt="New screenshot"][src*="/${imageId}/"]`).isVisible())) {
      return { detail: `the edit form does not hold ${imageId}`, outcome: "failed" };
    }
    await page.getByRole("button", { exact: true, name: "Save" }).first().click();
    // Pre-existing problems such as "Blueprint has no name" open a "Submission warnings" dialog
    // whose own Save forces the edit through.
    const warnings = page.getByRole("dialog").filter({ hasText: "Submission warnings" });
    let forced = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await sleep(1_000);
      if (new URL(page.url()).pathname === `/view/${key}`) return { outcome: "saved" };
      if (!forced && (await warnings.isVisible())) {
        await warnings.getByRole("button", { exact: true, name: "Save" }).click();
        forced = true;
      }
    }
    return { detail: `save never reached /view/${key}`, outcome: "failed" };
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
};

const firebaseImageId = async (key: string): Promise<string | null> => {
  const response = await fetch(
    `${databaseUrl}/blueprints/${encodeURIComponent(key)}/image/id.json`,
  );
  if (!response.ok) throw new Error(`Firebase returned ${response.status} for ${key}`);
  return (await response.json()) as string | null;
};

const confirmInFirebase = async (key: string, imageId: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await firebaseImageId(key)) === imageId) return true;
    await sleep(3_000);
  }
  return false;
};

const gatewayStatus = async (url: string): Promise<number> =>
  (await fetch(url, { method: "HEAD", redirect: "manual" })).status;

const auditLedger = async (ledger: ReplacementLedger): Promise<Record<string, string[]>> => {
  const problems: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(ledger.entries)) {
    if (entry.status !== ReplacementStatus.Saved || !entry.upload) continue;
    const { imageId, type } = entry.upload;
    const found = auditReplacement(entry.upload, gatewayOrigin, {
      firebaseImageId: await firebaseImageId(key),
      originalStatus: await gatewayStatus(
        gatewayImageUrl(gatewayOrigin, imageId, type, "original"),
      ),
      thumbnailStatus: await gatewayStatus(
        gatewayImageUrl(gatewayOrigin, imageId, type, "thumbnail"),
      ),
    });
    if (found.length > 0) problems[key] = found;
  }
  return problems;
};

const countStatuses = (ledger: ReplacementLedger): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const entry of Object.values(ledger.entries))
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  return counts;
};

const main = async (): Promise<void> => {
  const options = parseCommandOptions();

  if (options.login) {
    const context = await openBrowser(options.profile);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(siteOrigin);
    console.log("Sign in to Factorio Prints in the opened window, then close it.");
    await new Promise<void>((done) => context.on("close", () => done()));
    return;
  }

  const round = await loadRound(options.round);
  const ledgerPath = join(options.round, "replacement-ledger.json");
  const { blocked, queue } = buildReplacementQueue({ ...round, now: new Date() });
  const selected = options.limit ? queue.slice(0, options.limit) : queue;
  console.log(
    JSON.stringify(
      {
        blocked,
        execute: options.execute,
        ledger: countStatuses(round.ledger),
        queued: queue.length,
        reattaches: selected.filter((item) => item.upload).length,
        selected: selected.length,
        uploads: selected.filter((item) => !item.upload).length,
      },
      null,
      2,
    ),
  );

  let ledger = round.ledger;
  let stoppedReason: string | undefined;
  if (options.execute && !options.audit && selected.length > 0) {
    const context = await openBrowser(options.profile);
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      const result = await runReplacementLoop(
        selected,
        round.ledger,
        {
          confirmSaved: confirmInFirebase,
          currentImageId: firebaseImageId,
          log: (message) => console.log(`${new Date().toISOString()} ${message}`),
          now: () => new Date(),
          persistLedger: (current) => writeJsonAtomically(ledgerPath, current),
          saveImage: (key, imageId) => saveEditForm(page, key, imageId),
          sleep: (milliseconds) => sleep(milliseconds),
          uploadImage: (key, file, reuse) => uploadThroughEditForm(page, key, file, reuse),
        },
        {
          maximumConsecutiveRateLimits: 3,
          maximumConsecutiveSaveFailures: 3,
          uploadSpacingMilliseconds: 8_000,
          uploadsPerHour: 10,
        },
      );
      ledger = result.ledger;
      stoppedReason = result.stoppedReason;
    } finally {
      await context.close();
    }
  }

  if (!options.execute && !options.audit) return;
  const problems = await auditLedger(ledger);
  const report = {
    finishedAt: new Date().toISOString(),
    ledger: countStatuses(ledger),
    notLive: problems,
    stoppedReason,
  };
  await writeJsonAtomically(join(options.round, "replacement-report.json"), report);
  console.log(JSON.stringify(report, null, 2));
  if (stoppedReason || Object.keys(problems).length > 0) process.exitCode = 1;
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedModuleUrl) {
  await main();
}
