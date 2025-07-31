# Firebase Migration Scripts

## migrate-firebase-data.ts

This script helps fix existing data issues in your Firebase database before applying the new, stricter rules.

### What it does:

1. **Fixes blueprint data** - Ensures all required fields exist
2. **Syncs blueprint summaries** - Creates missing summaries and fixes existing ones
3. **Fixes favorite counts** - Reconciles counts with actual favorites
4. **Cleans up tags** - Ensures tag associations are consistent
5. **Fixes user data** - Removes invalid favorites and blueprint references

### Usage:

1. Install dependencies:
   ```bash
   npm install firebase-admin
   ```

2. Set up your Firebase Admin SDK credentials

3. Update the Firebase configuration in the script

4. Run the migration:
   ```bash
   npx ts-node scripts/migrate-firebase-data.ts
   ```

### When to run:

- Before deploying the new Firebase rules
- Periodically to fix any data drift
- After detecting inconsistencies in production
