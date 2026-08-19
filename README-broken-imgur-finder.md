# 🔍 Broken Imgur Link Finder

This script finds blueprints with broken Imgur image links by analyzing a local Firebase backup file using streaming JSON parsing to handle large files.

## 📦 Scripts

### Finding Broken Images

- `vp run imgur:check-one -- <backup.json> <blueprint-id>` - Check a specific blueprint
- `vp run imgur:check-first-10 -- <backup.json>` - Test with first 10 blueprints from backup
- `vp run imgur:scan-all -- <backup.json>` - Run full scan from backup
- `vp run imgur:scan-resume -- <backup.json>` - Run resumable scan from backup

### Fixing Broken Images

- `vp run imgur:fix-interactive -- <backup.json> <blueprint-id>` - Interactive script that guides you through manual fixes

## 📊 Output

The scripts generate two files:

- `broken-imgur-report.json` - Detailed JSON report
- `broken-imgur-report.csv` - CSV format for spreadsheets

## 🔧 Features

- **Streaming JSON parser** - Handles backup files of any size (tested with 1.5GB+)
- Checks all blueprints with imgur images
- 10-second timeout per image check
- Rate limiting to avoid hitting imgur limits
- Progress reporting
- Resumable version saves checkpoints

## 📋 Backup File Format

The scripts expect a Firebase export JSON file with this structure:

```json
{
  "blueprintSummaries": {
    "blueprintId1": {
      "title": "Blueprint Title",
      "imgurId": "abc123",
      "imgurType": "image/png",
      ...
    },
    ...
  }
}
```

## 🚀 Resumable Version

The resumable version (`find-broken-imgur:resume`) is useful for large scans:

- Saves progress to checkpoint file (`broken-imgur-checkpoint-streaming.json`)
- Can be interrupted and resumed
- Processes in batches of 50
- Automatically cleans up checkpoint on completion
- Uses streaming to handle files of any size

## 📄 Example Usage

### Checking for Broken Images

```bash
# Check a specific blueprint
vp run imgur:check-one -- ./backup.json -OTaHk_8pJg92J9_o8zQ

# Test with first 10 blueprints
vp run imgur:check-first-10 -- ./backup.json

# Full scan
vp run imgur:scan-all -- ./backup.json

# Resumable scan (can interrupt with Ctrl+C and resume later)
vp run imgur:scan-resume -- ./backup.json
```

### Fixing Broken Images

```bash
# Interactive fix process (guides you through manual steps)
vp run imgur:fix-interactive -- ./backup.json -OTaHk_8pJg92J9_o8zQ
```

## 🔧 Fix Process

The interactive fix script (`imgur:fix-interactive`) guides you through:

1. Sending a Discord message to BlueprintBot to regenerate the image
2. Downloading the generated image
3. Uploading to imgur using the FactorioBlueprints account
4. Updating the blueprint on factorioprints.com

The script saves progress between steps, so you can resume if interrupted.

## 🚨 Large File Support

The scripts use `stream-json` to parse JSON files in a streaming fashion, allowing them to process backup files that are too large to fit in memory. This is essential for production Firebase backups which can be several gigabytes in size.

## ⚠️ Important Notes

- Imgur returns 302 redirects for deleted images (not 404)
- The scripts detect these redirects as broken images
- Rate limiting is implemented to avoid hitting imgur's API limits
- Fix scripts require manual interaction due to authentication requirements
