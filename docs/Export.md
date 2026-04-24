# Export Data

Adminizer supports exporting filtered data from model list views in three formats: **JSON**, **CSV**, and **XLSX**.

## Overview

The export feature allows users to download all records (respecting the currently active filter) from any model list page. Export is available without pagination limits.

## Supported Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| **JSON** | Raw JSON array of objects | API integration, data backup, programmatic processing |
| **CSV** | Comma-separated values with UTF-8 BOM | Opening in Excel, Google Sheets, data analysis |
| **XLSX** | Native Excel spreadsheet with auto-sized columns | Business reports, presentations |

## Backend API

### Endpoint

```
POST /adminizer/model/:modelName/export
```

### Request Body

```json
{
  "format": "json|csv|xlsx",
  "filterId": "optional-filter-id"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | No | Export format: `json`, `csv`, or `xlsx`. Defaults to `json`. |
| `filterId` | string | No | ID of a saved filter to apply. If omitted, exports all records. Use `temporary` for session-based temporary filters. |
| `selectedFields` | string[] | No | Array of field names to include in export. If omitted, uses filter's column config or all fields. |

### Response

- **Success:** File download with appropriate `Content-Type` and `Content-Disposition` headers
- **400:** Invalid format or missing required data
- **401:** Unauthorized (if auth is enabled)
- **403:** Forbidden (insufficient permissions)
- **404:** Model not found
- **500:** Export failed (e.g., xlsx library not installed)

### Response Headers

```
Content-Type: application/json           (for JSON)
Content-Type: text/csv; charset=utf-8    (for CSV)
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet  (for XLSX)
Content-Disposition: attachment; filename="modelname_export_1234567890.json"
```

## Frontend Usage

The export button appears automatically in the table toolbar when the page loads.

### How to Export

1. Navigate to any model list page
2. (Optional) Apply a saved filter to narrow down results
3. Click the **Экспорт** (Export) button in the toolbar
4. Select the desired format: JSON, CSV, or XLSX
5. The file downloads automatically

### Filter Integration

- If a **saved filter** is active, only filtered records are exported
- If a **temporary filter** is applied, it is used for the export
- If **no filter** is active, all records are exported

## Implementation Details

### Controller: `src/controllers/exportData.ts`

The export controller:
1. Validates the user has `read-{modelName}-model` permission
2. Loads the saved filter (if `filterId` is provided)
3. Converts datetime conditions from HTML5 format to UTC
4. Applies custom column configuration from filter
5. Executes a query with no pagination (large limit)
6. Formats data based on field types (relationships, booleans, dates, JSON)
7. Generates the file and sends it as a download

### Route Registration: `src/system/Router.ts`

```typescript
import _exportData from "../controllers/exportData";

adminizer.app.post(`${baseRoute}/export`, adminizer.policyManager.bindPolicies(policies, _exportData));
```

### Frontend: `src/assets/js/components/list-table/table-toolbar.tsx`

The export dropdown:
- Uses `axios` with `responseType: 'blob'` for binary download
- Reads `filterId` from URL to preserve filter state
- Extracts filename from `Content-Disposition` header
- Shows toast notifications for success/error

## Dependencies

| Package | Purpose | Required |
|---------|---------|----------|
| `xlsx` | XLSX file generation | Yes (for XLSX export) |

Install xlsx:
```bash
npm install xlsx
```

## CSV Encoding

CSV files include a **UTF-8 BOM** (`\uFEFF`) prefix to ensure proper character encoding when opened in Microsoft Excel.

## Data Formatting

The export applies human-readable transformations:
- **Boolean:** `true` → `Yes`, `false` → `No`
- **Relationships:** Display field (title/name/id) is used
- **Has-Many:** Comma-separated list of display values
- **JSON:** Pretty-printed with indentation (2 spaces)
- **Dates:** ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Arrays:** Comma-separated values

## Security

- Export respects the same **access rights** as the list view
- Only users with `read-{modelName}-model` permission can export
- Filter access control is enforced (private filters only accessible by owner)
- Datetime conditions are validated and converted to prevent injection

## Extending

To add a new export format:

1. Add the format to the `ExportFormat` type in `exportData.ts`
2. Create a new `send{Format}Export` function
3. Add a case to the switch statement in the main controller
4. Add a menu item in `table-toolbar.tsx`

Example for PDF export:

```typescript
// In exportData.ts
async function sendPdfExport(res: ResType, data: Record<string, any>[], modelName: string) {
    // Generate PDF...
    return res.send(buffer);
}

// In the switch
case 'pdf':
    return sendPdfExport(res, exportData, entity.name);
```

```tsx
// In table-toolbar.tsx
<DropdownMenuItem onClick={() => handleExport('pdf')}>
    <span className="font-mono text-xs mr-2">PDF</span>
    <span className="text-muted-foreground text-xs">PDF документ</span>
</DropdownMenuItem>
```
