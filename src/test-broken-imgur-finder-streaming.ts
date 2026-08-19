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

async function testBrokenImgurFinderStreaming(backupFile: string) {
  console.log("🧪 Testing broken imgur finder with first 10 blueprints from local backup...\n");
  console.log(`📁 Reading backup from: ${backupFile}`);

  try {
    let count = 0;
    const maxCount = 10;

    const pipeline = new StreamChain([
      createReadStream(backupFile),
      StreamJson.parser(),
      Pick.pick({ filter: "blueprintSummaries" }),
      StreamObject.streamObject(),
    ]);

    for await (const data of pipeline) {
      if (count >= maxCount) break;

      const blueprintId = data.key;
      const summary = data.value as RawBlueprintSummary;

      console.log(`\n📘 Blueprint: ${summary.title}`);
      console.log(`  ID: ${blueprintId}`);

      if (!summary.imgurId) {
        console.log("  ⚠️  No imgur image");
        count++;
        continue;
      }

      console.log(`  Imgur ID: ${summary.imgurId}`);

      const result = await checkImgurUrl(summary.imgurId, summary.imgurType || "image/png");

      if (result.isValid) {
        console.log("  ✅ Image is valid");
      } else {
        console.log(
          `  ❌ Image is broken (Status: ${result.statusCode || "N/A"}, Error: ${result.error || "None"})`,
        );
      }

      count++;
    }

    console.log("\n✨ Test complete!");
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
  console.error("Usage: npm run test-broken-imgur <path-to-backup.json>");
  process.exit(1);
}

testBrokenImgurFinderStreaming(backupFile).catch(console.error);
