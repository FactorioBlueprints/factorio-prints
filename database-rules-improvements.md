# Firebase Database Rules Improvements

## Summary of Changes

### 🔒 Security Improvements

1. **Fixed byTag Write Vulnerability**
    - Changed from `.write: "true"` to authenticated blueprint owners only
    - Added validation to ensure tag consistency with blueprint data

2. **Removed Direct numberOfFavorites Writes**
    - Set `.write: "false"` on numberOfFavorites fields
    - Favorites count should be managed through Cloud Functions or atomic transactions

3. **Enhanced Validation Rules**
    - Added string length limits (titles: 1-500 chars, descriptions: 10000 chars)
    - Added regex validation for email addresses and imgur IDs
    - Added numeric range validation for image dimensions
    - Enforced boolean values for favorites and user blueprints

4. **Standardized Authorization**
    - Unified to use `author.userId` pattern consistently
    - Removed legacy `authorId` field dependencies in rules

### 🚀 Performance Improvements

1. **Added Missing Indexes**
    - blueprints: indexed on lastUpdatedDate, createdDate, authorId
    - users: indexed on displayName, email
    - thumbnails: indexed on blueprintId
    - blueprintSummaries: added imgurId index
    - tags: indexed on .value for efficient lookups
    - byTag: indexed on .value for tag queries

2. **Optimized Rule Structure**
    - Consolidated validation logic
    - Reduced redundant permission checks

### 🔗 Referential Integrity

1. **Blueprint-Summary Consistency**
    - Summary title must match blueprint title
    - Summary lastUpdatedDate must match blueprint lastUpdatedDate
    - Summary can only exist if blueprint exists

2. **Tag Validation**
    - Blueprint tags must exist in /tags collection
    - byTag entries must correspond to actual blueprint tags

3. **User References**
    - User blueprints must reference existing blueprints
    - User favorites must reference existing blueprint summaries

4. **Private Data Protection**
    - blueprintsPrivate entries require corresponding blueprint
    - Validates imgur URL format for security

### 📊 Data Consistency

1. **Immutable Fields**
    - createdDate cannot be modified after creation
    - author/authorId cannot be changed after creation

2. **Atomic Operations**
    - Removed direct write access to denormalized counts
    - These should be managed by server-side functions

3. **Type Safety**
    - Enforced strict data types for all fields
    - Added format validation for complex types

## Migration Notes

1. **numberOfFavorites Management**
    - Need to implement Cloud Functions for atomic favorite count updates
    - Current favorite toggle operations will need adjustment

2. **byTag Updates**
    - Need to update code that writes to byTag collection
    - Should be done atomically with blueprint tag updates

3. **Validation Failures**
    - Some existing data might fail new validation rules
    - Run data migration to fix:
        - Missing required fields
        - Invalid formats
        - Broken references

## Next Steps

1. Test rules in Firebase emulator
2. Deploy Cloud Functions from `functions/src/index.ts` for:
    - Atomic favorite count updates
    - Tag synchronization
    - Cascade deletes
3. Update client code to handle new validation requirements
4. Run `scripts/migrate-firebase-data.ts` to fix existing inconsistencies
