import { createReadStream } from "fs";
import StreamChain from "stream-chain";
import StreamJson from "stream-json";
import Pick from "stream-json/filters/Pick.js";
import StreamObject from "stream-json/streamers/StreamObject.js";
import type { RawBlueprintSummary } from "./schemas";

async function checkImgurUrl(
  imgurId: string,
  imgurType: string,
): Promise<{ isValid: boolean; statusCode?: number; error?: string }> {
  try {
    const typeParts = imgurType.split("/");
    const extension = typeParts.length > 1 ? typeParts[1] : "png";
    const url = `https://i.imgur.com/${imgurId}.${extension}`;

    console.log(`  🔗 Checking: ${url}`);

    const controller = new AbortController();
    // 10 second timeout
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Don't follow redirects
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "manual",
      });

      clearTimeout(timeoutId);

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

async function checkSpecificBlueprint(backupFile: string, targetBlueprintId: string) {
  console.log(`🔍 Searching for blueprint: ${targetBlueprintId}\n`);
  console.log(`📁 Reading backup from: ${backupFile}`);

  try {
    const pipeline = new StreamChain([
      createReadStream(backupFile),
      StreamJson.parser(),
      Pick.pick({ filter: "blueprintSummaries" }),
      StreamObject.streamObject(),
    ]);

    let found = false;

    for await (const data of pipeline) {
      const blueprintId = data.key;

      if (blueprintId === targetBlueprintId) {
        found = true;
        const summary = data.value as RawBlueprintSummary;

        console.log(`\n✅ Found blueprint!`);
        console.log(`📘 Title: ${summary.title}`);
        console.log(`  ID: ${blueprintId}`);
        console.log(
          `  Last Updated: ${summary.lastUpdatedDate ? new Date(summary.lastUpdatedDate).toLocaleString() : "Unknown"}`,
        );

        if (!summary.imgurId) {
          console.log("\n⚠️  No imgur image for this blueprint");
        } else {
          console.log(`\n🖼️  Imgur ID: ${summary.imgurId}`);
          console.log(`  Type: ${summary.imgurType || "image/png"}`);

          const result = await checkImgurUrl(summary.imgurId, summary.imgurType || "image/png");

          if (result.isValid) {
            console.log("  ✅ Image is valid");
          } else {
            console.log(
              `  ❌ Image is broken (Status: ${result.statusCode || "N/A"}, Error: ${result.error || "None"})`,
            );
          }

          const typeParts = (summary.imgurType || "image/png").split("/");
          const extension = typeParts.length > 1 ? typeParts[1] : "png";
          console.log(`\n📎 Direct link: https://i.imgur.com/${summary.imgurId}.${extension}`);
        }

        break;
      }
    }

    if (!found) {
      console.log(`\n❌ Blueprint not found: ${targetBlueprintId}`);
    }
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

const backupFile = process.argv[2];
const blueprintId = process.argv[3];

if (!backupFile || !blueprintId) {
  console.error("❌ Please provide both the backup file path and blueprint ID");
  console.error("Usage: npm run check-blueprint <path-to-backup.json> <blueprint-id>");
  process.exit(1);
}

checkSpecificBlueprint(backupFile, blueprintId).catch(console.error);
