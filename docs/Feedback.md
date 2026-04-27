# Feedback Handler

The **Feedback** feature adds a *Send feedback* link below the version number in the sidebar. When clicked, a modal with a title, description, and file attachments opens. Submissions are forwarded to any `AbstractFeedbackHandler` you register.

The feature is **opt-in**: the link and the API endpoint only appear when a handler is registered on `adminizer.feedbackHandler`.

---

## Enabling the feature

### 1. Implement `AbstractFeedbackHandler`

```ts
import { AbstractFeedbackHandler, FeedbackPayload } from 'adminizer';

export class MyFeedbackHandler extends AbstractFeedbackHandler {
    async handle(payload: FeedbackPayload): Promise<void> {
        // payload.title       – string
        // payload.description – string
        // payload.files       – Array<{ originalname, mimetype, size, buffer }>
        console.log('New feedback:', payload.title);
    }
}
```

### 2. Register the handler

Call `adminizer.feedbackHandler.register()` **after** `adminizer.init()`:

```ts
import { MyFeedbackHandler } from './MyFeedbackHandler';

await adminizer.init(config);
adminizer.feedbackHandler.register(new MyFeedbackHandler());
```

That's it. The *Send feedback* link will appear in the sidebar automatically.

---

## `FeedbackPayload`

| Field         | Type                                                                | Description                        |
|---------------|---------------------------------------------------------------------|------------------------------------|
| `title`       | `string`                                                            | Required – user-provided subject   |
| `description` | `string`                                                            | Optional freeform text             |
| `files`       | `Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>` | Uploaded attachments |

---

## File size limit

Each uploaded file is limited to **5 MB**. The frontend validates this before submitting; the backend enforces it via `multer` and returns HTTP `413` if exceeded.

---

## API endpoint

`POST {routePrefix}/api/feedback` — `multipart/form-data`

| Field         | Type      | Required |
|---------------|-----------|----------|
| `title`       | `string`  | yes      |
| `description` | `string`  | no       |
| `files`       | file(s)   | no       |

Requires an active user session (goes through standard Adminizer policies).

---

## Fixture example

The built-in fixture registers `FileFeedbackHandler`, which saves each submission as a directory under `.tmp/feedback/`:

```
.tmp/feedback/
  1714300000000-abc123/
    meta.json          ← title, description, file list, timestamp
    attachment.pdf     ← uploaded files (if any)
```