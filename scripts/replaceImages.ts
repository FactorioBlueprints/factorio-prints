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
  classifyImageField,
  emptyReplacementLedger,
  ImageFieldState,
  parseImgurUploadState,
  replacementCandidatesSchema,
  replacementDecisionsSchema,
  type ReplacementLedger,
  replacementLedgerSchema,
  ReplacementStatus,
  runReplacementLoop,
  type SaveOutcome,
  type UploadState,
  uploadPlanSchema,
} from "./imageReplacementCore.ts";

// Applies a reviewed screenshot-replacement round from a round directory holding
// decisions.json, candidates.json and upload-plan.json (plus an optional hold-keys.txt).
//
//   node scripts/replaceImages.ts --round <dir> --login     sign in to Imgur and Factorio Prints once
//   node scripts/replaceImages.ts --round <dir>             dry run: show what would happen
//   node scripts/replaceImages.ts --round <dir> --execute   upload, save, then audit
//
// Progress lives in <dir>/replacement-ledger.json, so rerunning resumes where the last run stopped.

const databaseUrl = "https://facorio-blueprints.firebaseio.com";
const browserUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36";
const minute = 60 * 1_000;

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

const observeImgurPage = (page: Page) =>
  page.evaluate(() => ({
    captcha: /not a robot|Captcha is required/i.test(document.body.innerText),
    failed: /upload failed/i.test(document.body.innerText),
    imageFiles: [
      ...new Set(
        [...document.querySelectorAll("img")]
          .map((image) => image.src)
          .filter((source) => /^https:\/\/i\.imgur\.com\/\w+\.\w+$/.test(source))
          .map((source) => source.split("/").pop()!),
      ),
    ],
    url: location.href,
  }));

// An upload made while signed out still succeeds, but anonymously, and Imgur purges anonymous
// images: the exact failure these rounds repair. Refuse rather than upload into that.
const uploadToImgur = async (page: Page, file: string): Promise<UploadState> => {
  await page.goto("https://imgur.com/upload", { waitUntil: "domcontentloaded" });
  const avatar = page.locator(".NavbarAvatar").first();
  if (!(await avatar.isVisible({ timeout: 15_000 }).catch(() => false))) {
    return { kind: "ambiguous", reason: "not signed in to Imgur; run with --login first" };
  }
  await page.locator('input[type="file"]').first().setInputFiles(file);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(1_500);
    const observation = await observeImgurPage(page);
    const leftUploadPage = !new URL(observation.url).pathname.startsWith("/upload");
    if (
      observation.captcha ||
      observation.failed ||
      (leftUploadPage && observation.imageFiles.length > 0)
    ) {
      return parseImgurUploadState(observation);
    }
  }
  return parseImgurUploadState(await observeImgurPage(page));
};

const saveOnFactorioPrints = async (
  page: Page,
  key: string,
  previousImgurId: string | null,
  imgurId: string,
): Promise<SaveOutcome> => {
  await page.goto(`https://factorioprints.com/edit/${key}`, { waitUntil: "domcontentloaded" });
  const field = page.locator('input[name="imageUrl"]');
  try {
    await field.waitFor({ timeout: 45_000 });
  } catch {
    const signedOut = await page
      .getByText(/sign in/i)
      .first()
      .isVisible()
      .catch(() => false);
    return {
      detail: signedOut ? "not signed in to Factorio Prints" : "no image field on the edit page",
      outcome: "failed",
    };
  }
  const fieldValue = await field.inputValue();
  const state = classifyImageField(fieldValue, previousImgurId, imgurId);
  if (state === ImageFieldState.AlreadySaved) return { outcome: "alreadySaved" };
  if (state === ImageFieldState.Conflict)
    return { detail: `field held "${fieldValue}"`, outcome: "conflict" };

  await field.fill(`https://imgur.com/${imgurId}`);
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
};

const firebaseImageId = async (key: string): Promise<string | null> => {
  const response = await fetch(
    `${databaseUrl}/blueprints/${encodeURIComponent(key)}/image/id.json`,
  );
  if (!response.ok) throw new Error(`Firebase returned ${response.status} for ${key}`);
  return (await response.json()) as string | null;
};

const confirmInFirebase = async (key: string, imgurId: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await firebaseImageId(key)) === imgurId) return true;
    await sleep(3_000);
  }
  return false;
};

// Imgur 429s bursts of requests, so the audit runs serially with a browser user agent and backs
// off when throttled. `redirect: "manual"` keeps the 302 that marks a deleted image visible.
const imgurStatus = async (url: string): Promise<number> => {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": browserUserAgent },
      method: "HEAD",
      redirect: "manual",
    });
    if (response.status !== 429 || attempt === 4) return response.status;
    await sleep(10_000 * attempt);
  }
};

const auditLedger = async (ledger: ReplacementLedger): Promise<Record<string, string[]>> => {
  const problems: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(ledger.entries)) {
    if (entry.status !== ReplacementStatus.Saved || !entry.upload) continue;
    const { imgurId } = entry.upload;
    const found = auditReplacement(imgurId, {
      firebaseImageId: await firebaseImageId(key),
      fullStatus: await imgurStatus(`https://i.imgur.com/${imgurId}.png`),
      thumbnailStatus: await imgurStatus(`https://i.imgur.com/${imgurId}l.png`),
    });
    if (found.length > 0) problems[key] = found;
    await sleep(300);
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
    await page.goto("https://imgur.com/signin");
    await (await context.newPage()).goto("https://factorioprints.com/");
    console.log("Sign in to Imgur and Factorio Prints in the opened window, then close it.");
    await new Promise<void>((done) => context.on("close", () => done()));
    return;
  }

  const round = await loadRound(options.round);
  const ledgerPath = join(options.round, "replacement-ledger.json");
  const { blocked, queue } = buildReplacementQueue(round);
  const selected = options.limit ? queue.slice(0, options.limit) : queue;
  console.log(
    JSON.stringify(
      {
        blocked,
        execute: options.execute,
        ledger: countStatuses(round.ledger),
        queued: queue.length,
        saves: selected.filter((item) => item.step === "save").length,
        selected: selected.length,
        uploads: selected.filter((item) => item.step === "upload").length,
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
      const imgurPage = context.pages()[0] ?? (await context.newPage());
      const factorioPrintsPage = await context.newPage();
      const result = await runReplacementLoop(
        selected,
        round.ledger,
        {
          confirmSaved: confirmInFirebase,
          log: (message) => console.log(`${new Date().toISOString()} ${message}`),
          now: () => new Date(),
          persistLedger: (current) => writeJsonAtomically(ledgerPath, current),
          saveImage: (key, previousImgurId, imgurId) =>
            saveOnFactorioPrints(factorioPrintsPage, key, previousImgurId, imgurId),
          sleep: (milliseconds) => sleep(milliseconds),
          uploadImage: (file) => uploadToImgur(imgurPage, file),
        },
        {
          captchaBackoffMilliseconds: 30 * minute,
          maximumConsecutiveCaptchas: 4,
          maximumConsecutiveSaveFailures: 3,
          uploadSpacingMilliseconds: 8_000,
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
