# Disqus to Firebase Migration Scripts

These scripts help you migrate comments from Disqus to Firebase Realtime Database.

## Prerequisites

1. **Disqus Export**: Export your comments from Disqus Admin Panel
   - Go to Disqus Admin > Community > Export
   - Click "Export" - you'll receive a gzipped XML file via email

2. **Firebase Service Account**: Create a service account for Firebase Admin SDK
   - Go to Firebase Console > Project Settings > Service Accounts
   - Generate a new private key
   - Save the JSON file securely

3. **Dependencies**: Install required packages
   ```bash
   npm install xml2js firebase-admin zod tsx
   ```

## Usage

### Step 1: Export Disqus Comments to JSON

Convert the Disqus XML export to a structured JSON format:

```bash
tsx scripts/disqus-export.ts disqus-export.xml.gz comments.json
```

This will:
- Parse the Disqus XML export
- Extract blueprint IDs from URLs
- Build comment hierarchies (with replies)
- Output statistics about threads and comments

### Step 2: Migrate to Firebase

Import the JSON data into Firebase Realtime Database:

```bash
# Dry run (test without importing)
tsx scripts/migrate-to-firebase.ts --dry-run service-account.json https://your-app.firebaseio.com comments.json

# Actual migration
tsx scripts/migrate-to-firebase.ts service-account.json https://your-app.firebaseio.com comments.json

# Skip spam comments
tsx scripts/migrate-to-firebase.ts --skip-spam service-account.json https://your-app.firebaseio.com comments.json

# Custom author ID prefix
tsx scripts/migrate-to-firebase.ts --author-prefix legacy service-account.json https://your-app.firebaseio.com comments.json
```

## Options

### disqus-export.ts
- **Input**: Disqus XML export (can be `.xml` or `.xml.gz`)
- **Output**: JSON file with processed comments

### migrate-to-firebase.ts
- `--dry-run`: Test the migration without writing to Firebase
- `--skip-spam`: Skip comments marked as spam in Disqus
- `--author-prefix`: Prefix for generated author IDs (default: "disqus")

## Data Structure

### Exported JSON Format
```json
[
  {
    "id": "thread_id",
    "blueprintId": "abc123",
    "url": "https://factorioprints.com/view/abc123",
    "title": "Thread Title",
    "createdAt": "2020-01-01T00:00:00Z",
    "comments": [
      {
        "id": "comment_id",
        "threadId": "thread_id",
        "blueprintId": "abc123",
        "parentId": null,
        "authorName": "John Doe",
        "authorEmail": "john@example.com",
        "content": "Comment text",
        "createdAt": "2020-01-01T00:00:00Z",
        "isDeleted": false,
        "isSpam": false,
        "replies": []
      }
    ]
  }
]
```

### Firebase Structure
```
comments/
  {blueprintId}/
    {commentId}/
      authorId: "disqus_john_example_com"
      authorDisplayName: "John Doe"
      content: "Comment text"
      createdAt: 1577836800000
      updatedAt: 1577836800000
      parentId: null
      isDeleted: false
```

## Notes

- Only threads with extractable blueprint IDs will be migrated
- Deleted threads are automatically skipped
- Comment hierarchy is preserved (replies maintain parent relationships)
- Author IDs are generated from email (if available) or name
- Timestamps are converted to milliseconds (Firebase format)
- The migration is idempotent - running it multiple times will create duplicate comments
