# Feed Export API

Public API for exporting filtered data in JSON and XML (Atom) formats. It allows external systems to fetch filtered data by URL without an Adminizer UI session.

## Overview

Filters with enabled API access generate a unique `apiKey`, which can be used to fetch data in the following formats:

- **JSON** for programmatic integrations
- **XML (Atom)** for RSS-like feeds, marketplaces, news aggregators, and similar consumers

## Enabling API Access For A Filter

1. Open the record list for the target model.
2. Click **Filters** and select an existing filter to edit.
3. Find the **API access (feed)** section at the bottom of the dialog.
4. Enable the toggle.
5. Click **Show** to view the feed links.
6. Copy the JSON or XML URL.

### Key Generation

- The first time API access is enabled, Adminizer automatically generates an `apiKey` (UUID v4).
- The **Regenerate** button creates a new key, and the previous link stops working.
- The key is stored in the database in the `Filter` model.

## Endpoints

### JSON Export

```http
GET /adminizer/api/feed/{apiKey}.json
```

**Response:**

```json
{
  "feed": {
    "title": "Filter title",
    "description": "Filter description",
    "modelName": "Example",
    "generatedAt": "2026-04-06T12:00:00.000Z",
    "totalItems": 42,
    "apiKey": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "id": 1,
        "name": "Record 1",
        "status": "active",
        "createdAt": "2026-04-01T10:00:00.000Z"
      }
    ]
  }
}
```

### XML (Atom) Export

```http
GET /adminizer/api/feed/{apiKey}.xml
```

**Response:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>/adminizer/api/feed/550e8400-e29b-41d4-a716-446655440000</id>
  <title>Filter title</title>
  <subtitle>Filter description</subtitle>
  <updated>2026-04-06T12:00:00.000Z</updated>
  <link href="/adminizer/api/feed/550e8400-e29b-41d4-a716-446655440000.xml" rel="self" />
  <generator>Adminizer</generator>
  <entry>
    <id>1</id>
    <title>Record 1</title>
    <updated>2026-04-01T10:00:00.000Z</updated>
    <summary>Record 1</summary>
    <content type="html">
      <![CDATA[
      <table>
        <tr><th>id</th><td>1</td></tr>
        <tr><th>name</th><td>Record 1</td></tr>
      </table>
      ]]>
    </content>
    <data>{"id":1,"name":"Record 1"}</data>
  </entry>
</feed>
```

## Usage Examples

### curl

```bash
# JSON
curl https://example.com/adminizer/api/feed/YOUR_API_KEY.json

# XML
curl https://example.com/adminizer/api/feed/YOUR_API_KEY.xml
```

### JavaScript / Fetch

```javascript
const response = await fetch('/adminizer/api/feed/YOUR_API_KEY.json');
const data = await response.json();
console.log(data.feed.items);
```

### Python

```python
import requests

url = "https://example.com/adminizer/api/feed/YOUR_API_KEY.json"
response = requests.get(url)
data = response.json()

for item in data['feed']['items']:
    print(item['name'])
```

### RSS Aggregator

Add `https://example.com/adminizer/api/feed/YOUR_API_KEY.xml` to your RSS reader, such as Feedly or Inoreader.

## Security

- Access requires two keys: the filter `apiKey` and the user `userKey` (`User.apiKey`).
- The `apiKey` must belong to a private filter with API access enabled.
- The `userKey` is validated before the feed is generated.
- Global authorization must be enabled (`auth.enable`).
- If the filter key is compromised, regenerate the `apiKey` in the filter UI.
- If the user key is compromised, regenerate the `userKey`.

## Errors

| Code | Description |
|------|-------------|
| `400` | Invalid format. Only `json` and `xml` are supported. |
| `401` | `userKey` was not provided. |
| `403` | Authorization is disabled or `userKey` is invalid. |
| `404` | Filter was not found or API access is disabled. |
| `500` | Internal server error. |

**Error example:**

```json
{
  "error": "Filter not found or API access is disabled",
  "message": "Check your apiKey or ensure API access is enabled for this filter"
}
```

## Architecture

### Files

| File | Description |
|------|-------------|
| `src/services/FeedService.ts` | Feed generation service (JSON + XML). |
| `src/controllers/feed.ts` | HTTP controller. |
| `src/system/Router.ts` | Route registration. |
| `src/controllers/filter-fields/savedFilters.ts` | `apiKey` generation on save. |
| `src/assets/js/components/list-table/filter-panel-save-dialog.tsx` | API management UI. |

### Data Format

Data is formatted the same way as in regular exports (`exportData.ts`):

- Relations are rendered by title field.
- Dates use ISO 8601.
- Booleans are rendered as `"Yes"` or `"No"`.
- Arrays are joined with commas.
- JSON values are serialized to strings.

Filters are executed through the same flow as list export: filter conditions are converted by `QueryBuilder` into internal `QueryCriteria`, and the ORM adapter translates the criteria into its query format.

## Customization

### Change The JSON Structure

Edit the `generateJsonFeed()` method in `FeedService.ts`:

```typescript
async generateJsonFeed(filter: Filter): Promise<any> {
    const { records, fields, modelName } = await this.fetchFilterData(filter);
    // Custom logic
    return { /* custom structure */ };
}
```

### Change The XML Format

Edit the `buildAtomXml()` method in `FeedService.ts`.
