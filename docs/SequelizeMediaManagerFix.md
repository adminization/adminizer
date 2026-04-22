# Sequelize MediaManager Fix

## Problem

When using the MediaManager with Sequelize ORM, the following error occurred:

```
SQLITE_ERROR: no such column: MediaManagerAP.parent
```

The error appeared when querying the MediaManager with criteria like `{ parent: null, group: 'avatars' }`.

Generated SQL was incorrect:
```sql
WHERE `MediaManagerAP`.`parent` IS NULL
```

Instead of the correct:
```sql
WHERE `MediaManagerAP`.`parentId` IS NULL
```

## Root Cause

The `_convertCriteriaToSequelize` method in `src/lib/model/adapter/sequelize.ts` had a bug in the order of operations.

**Before the fix:**
```typescript
for (const key of allKeys) {
    const value = criteria[key];

    // ❌ This block was FIRST and skipped association key replacement
    if (value === null) {
        result[key] = null;  // Used 'parent' instead of 'parentId'
        continue;            // Skipped all other logic!
    }
    
    // ... later: association key replacement code (never reached for null values)
}
```

When a criteria contained `{ parent: null }`, the null check triggered immediately and copied the key as-is (`parent`) without converting it to the foreign key column name (`parentId`).

## Solution

Moved the association key replacement logic **BEFORE** the null check, so that all keys (including null values) are properly converted:

```typescript
for (const key of allKeys) {
    const value = criteria[key];

    // ✅ FIRST: Replace association key with foreign key
    let targetKey: string | typeof key = key;
    
    if (typeof key === 'string') {
        const attr = this.attributes?.[key];
        
        // Check if this is an association attribute
        if (attr?.type === "association" && attr.via) {
            targetKey = attr.via;  // e.g., 'parent' → 'parentId'
        } else if (this.model.associations[key]) {
            // Fallback: check associations directly
            const assoc = this.model.associations[key];
            if (assoc && 'foreignKey' in assoc) {
                targetKey = assoc.foreignKey as string;
            }
        }
    }

    // ✅ THEN: Handle null values (now uses converted targetKey)
    if (value === null) {
        result[targetKey] = {[Op.is]: null};  // Correctly uses 'parentId'
        continue;
    }
    
    // ... rest of the logic also uses targetKey
}
```

## Files Changed

- `src/lib/model/adapter/sequelize.ts` - Moved association key replacement to occur before null check (lines ~240-262)

## Testing

After applying the fix:
1. Build the project: `npm run build` ✓
2. Start the dev server: `npm run dev` or `npm run start`
3. Access the MediaManager in the admin panel
4. Verify that media items load without database errors ✓

The fix was verified with a test script that confirmed:
- `{ parent: null }` is correctly converted to `{ parentId: {[Op.is]: null} }`
- Generated SQL: `WHERE MediaManagerAP.parentId IS NULL` ✓
- Query executes successfully ✓

## Notes

- This fix only affects the Sequelize adapter
- Waterline adapter is not affected (it uses native `parent` field)
- The fix handles all `null` criteria values for association fields, not just MediaManager
- TypeScript types were updated to properly handle Symbol keys in criteria objects
