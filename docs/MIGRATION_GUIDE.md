# Configuration Migration Guide

This guide helps you migrate from the old hardcoded conference configuration to the new external JSON-based configuration.

## What Changed?

**Before (Hardcoded):**
- Conference settings were hardcoded in `src/config/conferences.ts`
- Adding a new conference required code changes
- Not suitable for OSS distribution

**After (External Configuration):**
- Conference settings are in `config/conferences.json` (Git-ignored)
- Template file `config/conferences.example.json` is provided
- Environment variables for passwords remain the same
- Easy to add multiple conferences

## Migration Steps

### Step 1: Create Configuration File

```bash
# Copy the example configuration
cp config/conferences.example.json config/conferences.json
```

### Step 2: Convert Your Old Configuration

If you had this in `src/config/conferences.ts`:

```typescript
{
  id: 'demo-conf',
  name: 'Demo Conference 2025',
  password: process.env.CONFERENCE_DEMO_CONF_PASSWORD,
  spreadsheetId: process.env.NEXT_PUBLIC_DEMO_SPREADSHEET_ID,
  sheetConfig: {
    sheetName: 'シート1',
    startRow: 2,
    columns: {
      id: 0,
      name: 3,
      checkedIn: 10,
      // ... other columns
    }
  }
}
```

Convert it to `config/conferences.json`:

```json
{
  "conferences": [
    {
      "id": "demo-conf",
      "name": "Demo Conference 2025",
      "passwordEnvVar": "CONFERENCE_DEMO_CONF_PASSWORD",
      "spreadsheetId": "your-actual-spreadsheet-id",
      "sheetConfig": {
        "sheetName": "シート1",
        "startRow": 2,
        "columns": {
          "id": 0,
          "name": 3,
          "checkedIn": 10
        }
      }
    }
  ]
}
```

**Key Changes:**
1. `password` → `passwordEnvVar` (stores the env var name, not the value)
2. `spreadsheetId` → actual ID string (not env var reference)
3. Wrapped in `{ "conferences": [...] }` array

### Step 3: Update Environment Variables

Your `.env.local` file should still have:

```bash
# JWT Secret
JWT_SECRET=your-jwt-secret

# Conference Password (same as before)
CONFERENCE_DEMO_CONF_PASSWORD=your-password-or-hash

# Spreadsheet ID is now in conferences.json, not here
# Remove: NEXT_PUBLIC_DEMO_SPREADSHEET_ID
```

### Step 4: Verify Configuration

Start the development server:

```bash
npm run dev
```

If you see this error:
```
❌ Conference configuration file not found
```

Make sure `config/conferences.json` exists.

If you see validation errors, check:
- Conference ID format (lowercase, alphanumeric, hyphens only)
- Environment variable names (uppercase, underscores)
- Column indices (must be non-negative integers)

### Step 5: Test

1. Try logging in with your conference credentials
2. Verify attendee list loads correctly
3. Test check-in/check-out functionality

## Adding Multiple Conferences

Simply add more objects to the `conferences` array:

```json
{
  "conferences": [
    {
      "id": "summer-conf-2025",
      "name": "Summer Conference 2025",
      "passwordEnvVar": "CONFERENCE_SUMMER_PASSWORD",
      "spreadsheetId": "spreadsheet-id-1",
      "sheetConfig": { /* ... */ }
    },
    {
      "id": "winter-conf-2025",
      "name": "Winter Conference 2025",
      "passwordEnvVar": "CONFERENCE_WINTER_PASSWORD",
      "spreadsheetId": "spreadsheet-id-2",
      "sheetConfig": { /* ... */ }
    }
  ]
}
```

Add corresponding environment variables:

```bash
CONFERENCE_SUMMER_PASSWORD=summer-password
CONFERENCE_WINTER_PASSWORD=winter-password
```

## Troubleshooting

### Error: "Missing required environment variable: CONFERENCE_*"

**Cause**: The environment variable specified in `passwordEnvVar` is not set.

**Solution**: Add the variable to `.env.local`:
```bash
CONFERENCE_YOUR_CONF_PASSWORD=your-password
```

### Error: "Invalid conference configuration"

**Cause**: JSON schema validation failed.

**Common issues:**
- Missing required fields (`id`, `name`, `passwordEnvVar`, `spreadsheetId`)
- Invalid conference ID format (must be lowercase with hyphens)
- Invalid column indices (must be >= 0)
- Duplicate conference IDs

**Solution**: Check the error message for specific field issues.

### Error: "Duplicate conference IDs found"

**Cause**: Multiple conferences have the same `id`.

**Solution**: Ensure each conference has a unique ID.

### JSON Syntax Errors

**Cause**: Invalid JSON format (missing commas, brackets, quotes, etc.)

**Solution**: Use a JSON validator or IDE with JSON support to check syntax.

## Rollback

If you need to rollback to the old configuration:

1. Restore `src/config/conferences.ts` from Git history
2. Update imports in API routes back to:
   ```typescript
   import { conferences, getConference } from '@/config/conferences';
   ```
3. Remove `config/conferences.json`

## Production Deployment

### Using Cloud Run

1. Create `config/conferences.json` with production values
2. Set environment variables in Cloud Run:
   ```bash
   gcloud run services update voxntry \
     --set-env-vars "CONFERENCE_YOUR_CONF_PASSWORD=$2b$12$..." \
     --set-env-vars "JWT_SECRET=your-production-secret"
   ```

### Using Docker

Include `config/conferences.json` in your Docker image, or mount it as a volume.

**Dockerfile:**
```dockerfile
COPY config/conferences.json /app/config/conferences.json
```

## Benefits of New Configuration

✅ **OSS-Ready**: Template file can be safely committed to Git
✅ **Flexible**: Easy to add/remove conferences without code changes
✅ **Secure**: Passwords remain in environment variables
✅ **Validated**: Zod schema ensures configuration correctness
✅ **Type-Safe**: TypeScript types are preserved

## Questions?

See [README.md](../README.md) for complete setup instructions.
