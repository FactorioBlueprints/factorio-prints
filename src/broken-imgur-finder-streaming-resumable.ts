import { createReadStream, writeFileSync, existsSync, readFileSync, unlinkSync } from "fs";
import StreamChain from "stream-chain";
import StreamJson from "stream-json";
import Pick from "stream-json/filters/Pick.js";
import StreamObject from "stream-json/streamers/StreamObject.js";
import type { RawBlueprintSummary } from "./schemas";

interface BrokenImgurEntry {
  blueprintId: string;
  title: string;
  imgurId: string;
  imgurUrl: string;
  statusCode?: number;
  error?: string;
  checkDate: string;
}

interface CheckpointData {
  lastBlueprintId: string;
  totalProcessed: number;
  totalChecked: number;
  totalBroken: number;
  brokenLinks: BrokenImgurEntry[];
  backupFile: string;
}

const CHECKPOINT_FILE = "./broken-imgur-checkpoint-streaming.json";
const BATCH_SIZE = 50;
const DELAY_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkImgurUrl(
  imgurId: string,
  imgurType: string,
): Promise<{ isValid: boolean; statusCode?: number; error?: string }> {
  try {
    const typeParts = imgurType.split("/");
    const extension = typeParts.length > 1 ? typeParts[1] : "png";
    const url = `https://i.imgur.com/${imgurId}.${extension}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "manual", // Don't follow redirects
      });

      clearTimeout(timeoutId);

      // Imgur returns 302 redirects for deleted images
      const isValid = response.status === 200;

      return {
        isValid,
        statusCode: response.status,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        isValid: false,
        error: "Request timeout (10s)",
      };
    }
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function loadCheckpoint(): CheckpointData | null {
  if (!existsSync(CHECKPOINT_FILE)) {
    return null;
  }

  try {
    const data = readFileSync(CHECKPOINT_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load checkpoint:", error);
    return null;
  }
}

function saveCheckpoint(data: CheckpointData) {
  try {
    writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to save checkpoint:", error);
  }
}

async function findBrokenImgurLinksStreamingResumable(backupFile: string) {
  console.log("🔍 Starting resumable search for broken imgur links from local backup...");
  console.log(`📁 Reading backup from: ${backupFile}`);

  let checkpoint = loadCheckpoint();

  // If checkpoint exists but for different file, start fresh
  if (checkpoint && checkpoint.backupFile !== backupFile) {
    console.log("⚠️  Checkpoint is for different backup file, starting fresh...");
    checkpoint = null;
  }

  let lastBlueprintId = checkpoint?.lastBlueprintId || "";
  let totalProcessed = checkpoint?.totalProcessed || 0;
  let totalChecked = checkpoint?.totalChecked || 0;
  let totalBroken = checkpoint?.totalBroken || 0;
  let brokenLinks = checkpoint?.brokenLinks || [];

  if (checkpoint) {
    console.log(`📚 Resuming from blueprint ID: ${lastBlueprintId}`);
    console.log(
      `   Progress: ${totalProcessed} processed, ${totalChecked} checked, ${totalBroken} broken`,
    );
  }

  try {
    const pipeline = new StreamChain([
      createReadStream(backupFile),
      StreamJson.parser(),
      Pick.pick({ filter: "blueprintSummaries" }),
      StreamObject.streamObject(),
    ]);

    let shouldSkip = !!lastBlueprintId;
    const batch: Array<{ blueprintId: string; summary: RawBlueprintSummary }> = [];

    for await (const data of pipeline) {
      const blueprintId = data.key;
      const summary = data.value as RawBlueprintSummary;

      // Skip until we reach the last processed blueprint
      if (shouldSkip) {
        if (blueprintId === lastBlueprintId) {
          shouldSkip = false;
        }
        continue;
      }

      totalProcessed++;

      if (summary.imgurId) {
        batch.push({ blueprintId, summary });
      }

      // Process batch when full
      if (batch.length >= BATCH_SIZE) {
        const currentBatch = [...batch];
        batch.length = 0;

        const checkPromises = currentBatch.map(async ({ blueprintId, summary }) => {
          const result = await checkImgurUrl(summary.imgurId, summary.imgurType || "image/png");
          return { blueprintId, summary, result };
        });

        const results = await Promise.all(checkPromises);

        for (const { blueprintId, summary, result } of results) {
          totalChecked++;

          if (!result.isValid) {
            totalBroken++;
            const typeParts = (summary.imgurType || "image/png").split("/");
            const extension = typeParts.length > 1 ? typeParts[1] : "png";

            const brokenEntry: BrokenImgurEntry = {
              blueprintId,
              title: summary.title,
              imgurId: summary.imgurId,
              imgurUrl: `https://i.imgur.com/${summary.imgurId}.${extension}`,
              statusCode: result.statusCode,
              error: result.error,
              checkDate: new Date().toISOString(),
            };

            brokenLinks.push(brokenEntry);
            console.log(`❌ Broken: ${summary.title} (${summary.imgurId})`);
          }
        }

        lastBlueprintId = currentBatch[currentBatch.length - 1].blueprintId;

        console.log(
          `✅ Batch complete: ${totalProcessed} processed, ${totalChecked} with imgur checked, ${totalBroken} broken`,
        );

        // Save checkpoint after each batch
        saveCheckpoint({
          lastBlueprintId,
          totalProcessed,
          totalChecked,
          totalBroken,
          brokenLinks,
          backupFile,
        });

        await delay(DELAY_MS);
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const checkPromises = batch.map(async ({ blueprintId, summary }) => {
        const result = await checkImgurUrl(summary.imgurId, summary.imgurType || "image/png");
        return { blueprintId, summary, result };
      });

      const results = await Promise.all(checkPromises);

      for (const { blueprintId, summary, result } of results) {
        totalChecked++;

        if (!result.isValid) {
          totalBroken++;
          const typeParts = (summary.imgurType || "image/png").split("/");
          const extension = typeParts.length > 1 ? typeParts[1] : "png";

          const brokenEntry: BrokenImgurEntry = {
            blueprintId,
            title: summary.title,
            imgurId: summary.imgurId,
            imgurUrl: `https://i.imgur.com/${summary.imgurId}.${extension}`,
            statusCode: result.statusCode,
            error: result.error,
            checkDate: new Date().toISOString(),
          };

          brokenLinks.push(brokenEntry);
          console.log(`❌ Broken: ${summary.title} (${summary.imgurId})`);
        }
      }
    }

    console.log("\n📊 Final Results:");
    console.log(`Total blueprints processed: ${totalProcessed}`);
    console.log(`Total with imgur links checked: ${totalChecked}`);
    console.log(`Total broken: ${totalBroken}`);
    console.log(
      `Percentage broken: ${totalChecked > 0 ? ((totalBroken / totalChecked) * 100).toFixed(2) : 0}%`,
    );

    const report = {
      metadata: {
        checkDate: new Date().toISOString(),
        backupFile,
        totalBlueprints: totalProcessed,
        totalWithImgur: totalChecked,
        totalBroken,
        percentageBroken: totalChecked > 0 ? ((totalBroken / totalChecked) * 100).toFixed(2) : "0",
      },
      brokenLinks: brokenLinks.sort((a, b) => a.title.localeCompare(b.title)),
    };

    const outputPath = "./broken-imgur-report.json";
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Report saved to: ${outputPath}`);

    const csvContent = [
      "Blueprint ID,Title,Imgur ID,Imgur URL,Status Code,Error",
      ...brokenLinks.map(
        (entry) =>
          `"${entry.blueprintId}","${entry.title.replace(/"/g, '""')}","${entry.imgurId}","${entry.imgurUrl}",${entry.statusCode || ""},${entry.error || ""}`,
      ),
    ].join("\n");

    const csvPath = "./broken-imgur-report.csv";
    writeFileSync(csvPath, csvContent);
    console.log(`📊 CSV report saved to: ${csvPath}`);

    if (existsSync(CHECKPOINT_FILE)) {
      console.log("\n🧹 Cleaning up checkpoint file...");
      unlinkSync(CHECKPOINT_FILE);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        console.error(`Could not find backup file: ${backupFile}`);
      } else if (error.message.includes("Unexpected")) {
        console.error('Invalid JSON format. Expected structure: { "blueprintSummaries": { ... } }');
      } else {
        console.log("\n💾 Progress saved to checkpoint. Run again to resume.");
      }
    }
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];
if (!backupFile) {
  console.error("❌ Please provide the path to the Firebase backup JSON file");
  console.error("Usage: npm run find-broken-imgur:resume <path-to-backup.json>");
  process.exit(1);
}

findBrokenImgurLinksStreamingResumable(backupFile).catch(console.error);
