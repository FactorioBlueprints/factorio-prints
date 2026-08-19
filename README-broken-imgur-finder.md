# 🔍 Broken Imgur Link Finder

This script finds blueprints with broken Imgur image links by analyzing a local Firebase backup file using streaming JSON parsing to handle large files.

## 📦 Scripts

- `npm run test-broken-imgur <backup.json>` - Test with first 10 blueprints from backup
- `npm run find-broken-imgur <backup.json>` - Run full scan from backup
- `npm run find-broken-imgur:resume <backup.json>` - Run resumable scan from backup

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

```bash
# Test with local backup (first 10 blueprints)
npm run test-broken-imgur ./firebase-backup-2024-01-31.json

# Full scan with local backup
npm run find-broken-imgur ./firebase-backup-2024-01-31.json

# Resumable scan (can interrupt with Ctrl+C and resume later)
npm run find-broken-imgur:resume ./firebase-backup-2024-01-31.json
```

## 🚨 Large File Support

The scripts use `stream-json` to parse JSON files in a streaming fashion, allowing them to process backup files that are too large to fit in memory. This is essential for production Firebase backups which can be several gigabytes in size.
