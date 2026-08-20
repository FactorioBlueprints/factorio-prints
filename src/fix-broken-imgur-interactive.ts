import { spawnSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import StreamChain from "stream-chain";
import StreamJson from "stream-json";
import Pick from "stream-json/filters/Pick.js";
import StreamObject from "stream-json/streamers/StreamObject.js";
import { z } from "zod";
import type { RawBlueprintSummary } from "./schemas";

const PROGRESS_FILE = "./imgur-fix-progress.json";

enum FixStep {
  Start = "start",
  DiscordSent = "discord_sent",
  ImageDownloaded = "image_downloaded",
  ImgurUploaded = "imgur_uploaded",
  Completed = "completed",
}

const fixProgressSchema = z
  .object({
    blueprintId: z.string().min(1),
    title: z.string().min(1),
    oldImgurId: z.string().min(1),
    step: z.enum(FixStep),
    downloadedImagePath: z.string().optional(),
    newImgurUrl: z.string().optional(),
    timestamp: z.string().datetime(),
  })
  .strict();

type FixProgress = z.infer<typeof fixProgressSchema>;

const blueprintIdSchema = z
  .string()
  .min(1)
  .regex(/^[^.#$[\]/]+$/);
const imgurUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const hostname = new URL(value).hostname;
    return hostname === "imgur.com" || hostname.endsWith(".imgur.com");
  }, "URL must point to imgur.com");
const imgurUploadResponseSchema = z
  .object({
    data: z.object({ link: imgurUrlSchema }).strict(),
    success: z.literal(true),
  })
  .strict();

async function findBlueprintInBackup(
  backupFile: string,
  blueprintId: string,
): Promise<RawBlueprintSummary | null> {
  const pipeline = new StreamChain([
    createReadStream(backupFile),
    StreamJson.parser(),
    Pick.pick({ filter: "blueprintSummaries" }),
    StreamObject.streamObject(),
  ]);

  for await (const data of pipeline) {
    if (data.key === blueprintId) {
      return data.value as RawBlueprintSummary;
    }
  }

  return null;
}

function loadProgress(): FixProgress | null {
  if (!existsSync(PROGRESS_FILE)) {
    return null;
  }

  return fixProgressSchema.parse(JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")));
}

function saveProgress(progress: FixProgress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function openUrl(url: string) {
  console.log(`\n🌐 Opening: ${url}`);
  const command = process.platform === "darwin" ? "open" : "xdg-open";
  const result = spawnSync(command, [url], { stdio: "ignore" });
  if (result.status !== 0) {
    console.log("   (Failed to auto-open, please open manually)");
  }
}

function copyToClipboard(value: string): void {
  if (process.platform !== "darwin") {
    return;
  }

  spawnSync("pbcopy", [], {
    input: value,
    stdio: ["pipe", "ignore", "ignore"],
  });
}

function hasImgurUploadCredentials(): boolean {
  return Boolean(process.env.IMGUR_ACCESS_TOKEN || process.env.IMGUR_CLIENT_ID);
}

function getImgurAuthorization(): string {
  if (process.env.IMGUR_ACCESS_TOKEN) {
    return `Bearer ${process.env.IMGUR_ACCESS_TOKEN}`;
  }
  if (process.env.IMGUR_CLIENT_ID) {
    return `Client-ID ${process.env.IMGUR_CLIENT_ID}`;
  }

  throw new Error("IMGUR_ACCESS_TOKEN or IMGUR_CLIENT_ID is required for API uploads.");
}

async function uploadToImgur(imagePath: string, title: string): Promise<string> {
  const formData = new FormData();
  formData.append("image", readFileSync(imagePath, { encoding: "base64" }));
  formData.append("title", title);
  formData.append("type", "base64");

  const response = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: { Authorization: getImgurAuthorization() },
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Imgur upload failed with status ${response.status}.`);
  }

  return imgurUploadResponseSchema.parse(await response.json()).data.link;
}

function findNewestImage(directory: string): string | null {
  const imageExtensions = new Set([".jpeg", ".jpg", ".png"]);
  const candidates = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase()))
    .map((entry) => {
      const path = join(directory, entry.name);
      return { path, modifiedAt: statSync(path).mtimeMs };
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  return candidates[0]?.path ?? null;
}

async function promptUser(message: string): Promise<string> {
  console.log(`\n${message}`);
  process.stdout.write("> ");

  return new Promise((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function fixBrokenImgurInteractive(backupFile: string, blueprintId: string) {
  console.log(`🔧 Interactive fix for broken imgur: ${blueprintId}\n`);

  // Check for existing progress
  let progress = loadProgress();
  if (progress && progress.blueprintId === blueprintId) {
    console.log(`📂 Found existing progress at step: ${progress.step}`);
    const resume = await promptUser("Resume from last step? (y/n)");
    if (resume.toLowerCase() !== "y") {
      progress = null;
    }
  } else {
    progress = null;
  }

  // Step 1: Find blueprint
  if (!progress || progress.step === FixStep.Start) {
    console.log("📋 Step 1: Finding blueprint details...");
    const blueprint = await findBlueprintInBackup(backupFile, blueprintId);
    if (!blueprint) {
      console.error("❌ Blueprint not found in backup");
      return;
    }
    console.log(`✅ Found: ${blueprint.title}`);
    console.log(
      `   Old imgur: https://i.imgur.com/${blueprint.imgurId}.${blueprint.imgurType?.split("/")[1] || "png"}`,
    );

    progress = {
      blueprintId,
      title: blueprint.title,
      oldImgurId: blueprint.imgurId,
      step: FixStep.Start,
      timestamp: new Date().toISOString(),
    };
    saveProgress(progress);
  }

  // Step 2: Discord message
  if (progress.step === FixStep.Start) {
    console.log("\n💬 Step 2: Send Discord message to BlueprintBot");
    console.log("   1. Open Discord and navigate to Factorio server #bot-stuff channel");
    openUrl("https://discord.com/channels/139677590393716737/198104144391700490");

    const blueprintUrl = `https://factorioprints.com/view/${blueprintId}`;
    console.log(`\n   2. Send this message:`);
    console.log(`      /bp url ${blueprintUrl}`);
    console.log(`\n   📋 Message copied to clipboard!`);
    copyToClipboard(`/bp url ${blueprintUrl}`);

    await promptUser("Press Enter after sending the Discord message...");

    progress.step = FixStep.DiscordSent;
    progress.timestamp = new Date().toISOString();
    saveProgress(progress);
  }

  // Step 3: Download image
  if (progress.step === FixStep.DiscordSent) {
    console.log("\n💾 Step 3: Download the generated image");
    console.log("   Wait for BlueprintBot to respond with an image");
    console.log("   Right-click the image and save it to your Downloads folder");

    await promptUser("Press Enter after downloading the image...");

    console.log("\n🔍 Looking for the newest file in ~/Downloads...");

    try {
      const downloadsPath = join(homedir(), "Downloads");
      const result = findNewestImage(downloadsPath);

      if (result) {
        console.log(`\n📄 Found newest image: ${result.split("/").pop()}`);
        const confirm = await promptUser("Is this the correct file? (y/n)");

        if (confirm.toLowerCase() === "y") {
          progress.downloadedImagePath = result;
          progress.step = FixStep.ImageDownloaded;
          progress.timestamp = new Date().toISOString();
          saveProgress(progress);
        } else {
          const imagePath = await promptUser("Please enter the correct file path:");

          if (!existsSync(imagePath)) {
            console.error("❌ File not found:", imagePath);
            return;
          }

          progress.downloadedImagePath = imagePath;
          progress.step = FixStep.ImageDownloaded;
          progress.timestamp = new Date().toISOString();
          saveProgress(progress);
        }
      } else {
        console.log("❌ No image files found in Downloads folder");
        const imagePath = await promptUser("Please enter the file path manually:");

        if (!existsSync(imagePath)) {
          console.error("❌ File not found:", imagePath);
          return;
        }

        progress.downloadedImagePath = imagePath;
        progress.step = FixStep.ImageDownloaded;
        progress.timestamp = new Date().toISOString();
        saveProgress(progress);
      }
    } catch {
      console.error("❌ Error searching Downloads folder");
      const imagePath = await promptUser("Please enter the file path manually:");

      if (!existsSync(imagePath)) {
        console.error("❌ File not found:", imagePath);
        return;
      }

      progress.downloadedImagePath = imagePath;
      progress.step = FixStep.ImageDownloaded;
      progress.timestamp = new Date().toISOString();
      saveProgress(progress);
    }
  }

  // Step 4: Upload to imgur
  if (progress.step === FixStep.ImageDownloaded && progress.downloadedImagePath) {
    console.log("\n☁️  Step 4: Upload to imgur");
    let imgurUrl: string;
    if (hasImgurUploadCredentials()) {
      console.log("   Uploading with configured Imgur API credentials...");
      imgurUrl = await uploadToImgur(progress.downloadedImagePath, progress.title);
      console.log(`   Uploaded: ${imgurUrl}`);
    } else {
      console.log("   1. Go to your imgur account");
      openUrl("https://imgur.com/user/FactorioBlueprints");

      console.log('\n   2. Click "New post" and upload the image:');
      console.log(`      ${progress.downloadedImagePath}`);
      console.log(`\n   3. Use title: ${progress.title}`);
      console.log('\n   4. After uploading, click ... then "Copy link"');

      imgurUrl = imgurUrlSchema.parse(await promptUser("Paste the new imgur URL:"));
    }

    progress.newImgurUrl = imgurUrl;
    progress.step = FixStep.ImgurUploaded;
    progress.timestamp = new Date().toISOString();
    saveProgress(progress);
  }

  // Step 5: Update Factorio Prints
  if (progress.step === FixStep.ImgurUploaded && progress.newImgurUrl) {
    console.log("\n🔄 Step 5: Update Factorio Prints");
    const editUrl = `https://factorioprints.com/edit/${blueprintId}`;
    console.log(`   1. Opening edit page...`);
    openUrl(editUrl);

    console.log(`\n   2. Replace the imgur URL with:`);
    console.log(`      ${progress.newImgurUrl}`);
    console.log(`\n   📋 URL copied to clipboard!`);
    copyToClipboard(progress.newImgurUrl);

    console.log("\n   3. Save the changes");

    await promptUser("Press Enter after saving...");

    progress.step = FixStep.Completed;
    progress.timestamp = new Date().toISOString();
    saveProgress(progress);
  }

  // Complete!
  console.log("\n🎉 Successfully fixed broken imgur image!");
  console.log(`   Blueprint: ${progress.title}`);
  console.log(`   Old imgur: https://i.imgur.com/${progress.oldImgurId}.png`);
  console.log(`   New imgur: ${progress.newImgurUrl}`);

  // Clean up progress file
  if (existsSync(PROGRESS_FILE)) {
    unlinkSync(PROGRESS_FILE);
  }
}

// Enable stdin for interactive input
process.stdin.resume();
process.stdin.setEncoding("utf8");

// Main execution
const backupFile = process.argv[2];
const blueprintIdInput = process.argv[3];

if (!backupFile || !blueprintIdInput) {
  console.error("❌ Please provide both the backup file path and blueprint ID");
  console.error("Usage: vp run imgur:fix-interactive -- <path-to-backup.json> <blueprint-id>");
  process.exit(1);
}

const blueprintId = blueprintIdSchema.parse(blueprintIdInput);

fixBrokenImgurInteractive(backupFile, blueprintId)
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.stdin.pause();
  });
