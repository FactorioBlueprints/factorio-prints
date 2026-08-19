import { createReadStream, writeFileSync } from "fs";
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

async function findBrokenImgurLinksStreaming(backupFile: string) {
  console.log("🔍 Starting search for broken imgur links from local backup...");
  console.log(`📁 Reading backup from: ${backupFile}`);

  const brokenLinks: BrokenImgurEntry[] = [];
  let totalChecked = 0;
  let totalBroken = 0;
  let totalBlueprints = 0;

  try {
    const pipeline = new StreamChain([
      createReadStream(backupFile),
      StreamJson.parser(),
      Pick.pick({ filter: "blueprintSummaries" }),
      StreamObject.streamObject(),
    ]);

    const batch: Array<{ blueprintId: string; summary: RawBlueprintSummary }> = [];
    const batchSize = 10;

    for await (const data of pipeline) {
      totalBlueprints++;

      const blueprintId = data.key;
      const summary = data.value as RawBlueprintSummary;

      if (summary.imgurId) {
        batch.push({ blueprintId, summary });
      }

      // Process batch when full or at specific intervals
      if (batch.length >= batchSize || (totalBlueprints % 100 === 0 && batch.length > 0)) {
        const currentBatch = [...batch];
        batch.length = 0;

        const batchPromises = currentBatch.map(async ({ blueprintId, summary }) => {
          totalChecked++;

          const result = await checkImgurUrl(summary.imgurId, summary.imgurType || "image/png");

          if (!result.isValid) {
            totalBroken++;
            const typeParts = (summary.imgurType || "image/png").split("/");
            const extension = typeParts.length > 1 ? typeParts[1] : "png";

            brokenLinks.push({
              blueprintId,
              title: summary.title,
              imgurId: summary.imgurId,
              imgurUrl: `https://i.imgur.com/${summary.imgurId}.${extension}`,
              statusCode: result.statusCode,
              error: result.error,
              checkDate: new Date().toISOString(),
            });

            console.log(`❌ Broken: ${summary.title} (${summary.imgurId})`);
          }
        });

        await Promise.all(batchPromises);

        if (totalBlueprints % 100 === 0) {
          console.log(
            `✅ Progress: ${totalBlueprints} processed, ${totalChecked} with imgur checked, ${totalBroken} broken`,
          );
        }

        await delay(1000);
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const batchPromises = batch.map(async ({ blueprintId, summary }) => {
        totalChecked++;

        const result = await checkImgurUrl(summary.imgurId, summary.imgurType || "image/png");

        if (!result.isValid) {
          totalBroken++;
          const typeParts = (summary.imgurType || "image/png").split("/");
          const extension = typeParts.length > 1 ? typeParts[1] : "png";

          brokenLinks.push({
            blueprintId,
            title: summary.title,
            imgurId: summary.imgurId,
            imgurUrl: `https://i.imgur.com/${summary.imgurId}.${extension}`,
            statusCode: result.statusCode,
            error: result.error,
            checkDate: new Date().toISOString(),
          });

          console.log(`❌ Broken: ${summary.title} (${summary.imgurId})`);
        }
      });

      await Promise.all(batchPromises);
    }

    console.log("\n📊 Final Results:");
    console.log(`Total blueprints: ${totalBlueprints}`);
    console.log(`Total with imgur links: ${totalChecked}`);
    console.log(`Total broken: ${totalBroken}`);
    console.log(
      `Percentage broken: ${totalChecked > 0 ? ((totalBroken / totalChecked) * 100).toFixed(2) : 0}%`,
    );

    const report = {
      metadata: {
        checkDate: new Date().toISOString(),
        backupFile,
        totalBlueprints,
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
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        console.error(`Could not find backup file: ${backupFile}`);
      } else if (error.message.includes("Unexpected")) {
        console.error('Invalid JSON format. Expected structure: { "blueprintSummaries": { ... } }');
      }
    }
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];
if (!backupFile) {
  console.error("❌ Please provide the path to the Firebase backup JSON file");
  console.error("Usage: npm run find-broken-imgur <path-to-backup.json>");
  process.exit(1);
}

findBrokenImgurLinksStreaming(backupFile).catch(console.error);
