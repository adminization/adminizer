# Practical Typography for Dense Web Interfaces — Tailwind Edition

This guide is a Tailwind-ready version of the dense UI typography rules for admin panels, CRM screens, monitoring dashboards, settings pages, tables, and configuration-heavy interfaces.

The goal is simple: keep the interface compact without making it feel glued together.

Dense UI does **not** mean tiny UI. Dense UI means clear hierarchy, predictable spacing, visible labels, readable controls, and stable rhythm.

---

## 1. Team summary

For admin panels and data-heavy screens, use **infrastructure typography**, not expressive brand typography.

Recommended baseline:

| Role | Size / line-height | Tailwind class |
|---|---:|---|
| Helper, caption, meta | 12 / 16 | `text-caption` |
| Main UI text, labels, inputs, table cells | 14 / 20 | `text-ui` |
| Long descriptions | 16 / 24 | `text-body` |
| Section title | 16 / 24 or 20 / 28 | `text-body font-semibold` or `text-title` |
| Page title | 20 / 28 or 24 / 32 | `text-title` or `text-page-title` |

Spacing baseline:

| Relationship | Recommended spacing | Tailwind class |
|---|---:|---|
| Label → control | 4–8px | `gap-micro` / `gap-tight` |
| Control → helper / error | 4–8px | `gap-micro` / `gap-tight` |
| Field → field | 12–16px | `gap-field` / `gap-group` |
| Subsection → subsection | 16–24px | `gap-group` / `gap-section` |
| Section → section | 24–32px | `gap-section` / `gap-page` |
| Card padding | 16–24px | `p-group` / `p-section` |

The most important rule:

> **Use parent stack gaps to separate large blocks. Do not rely on borders alone.**

---

## 2. Why dense interfaces become glued together

A dense interface usually breaks because the relationships between elements are unclear:

- A label looks the same as a value.
- Helper text is closer to the next field than to its own field.
- Section cards touch each other with no outer gap.
- Borders are used as the only separator.
- Inner cards and outer cards have the same border strength.
- Everything uses `text-xs` or low-contrast gray.
- Forms use too many columns before they establish a clear vertical rhythm.
- Long descriptions are placed directly between controls.

In Tailwind, this often starts with code like this:

```html
<div class="rounded-lg border border-zinc-800 p-4">
  <!-- content -->
</div>
<div class="rounded-lg border border-zinc-800 p-4">
  <!-- content -->
</div>
```

This looks harmless, but the blocks touch. The bottom border of the first card and the top border of the next card visually merge into one continuous block.

Use a parent stack instead:

```html
<div class="section-stack">
  <section class="section">
    <!-- content -->
  </section>

  <section class="section">
    <!-- content -->
  </section>
</div>
```

The parent owns the vertical rhythm. Cards should not decide their own outside spacing.

---

## 3. Specific fix for the “glued blocks” problem

In the screenshot, the blocks are technically separated by borders, but they still feel glued because the large sections are stacked with almost no external breathing room. The eye reads them as one giant bordered surface.

Fix it with three layers of spacing:

### Layer 1 — Page blocks

Use this for major settings groups such as:

- Firebase service account
- Channel activation
- Web config and VAPID
- Advanced settings

Recommended spacing: **24–32px**.

Tailwind pattern:

```html
<main class="page-container">
  <header class="page-header">
    <h1 class="page-title">Firebase Cloud Messaging</h1>
    <p class="page-description">Configure mobile and web push notifications.</p>
  </header>

  <div class="section-stack">
    <section class="section">...</section>
    <section class="section">...</section>
    <section class="section">...</section>
  </div>
</main>
```

### Layer 2 — Subsections inside a section

Use this for nested panels such as:

- Saved key preview
- Upload area
- Channel item
- VAPID key group

Recommended spacing: **16–24px**.

```html
<section class="section">
  <div class="section-header">
    <h2 class="section-title">Service account JSON</h2>
    <p class="section-description">Server-side secret used by Firebase Admin SDK.</p>
  </div>

  <div class="subsection-stack">
    <div class="subsection">Upload JSON file</div>
    <div class="subsection">Saved key</div>
  </div>
</section>
```

### Layer 3 — Fields inside a subsection

Use this for labels, inputs, helpers, errors, and checkboxes.

Recommended spacing: **4–16px** depending on the relationship.

```html
<div class="field">
  <label class="label" for="apiKey">apiKey</label>
  <input id="apiKey" class="input" />
  <p class="help">Firebase Console → Project settings → General → Your apps.</p>
</div>
```

### Rule of thumb

If two blocks have visible borders, they need a visible gap between them.

For dense admin UI:

```txt
Major sections:      gap-section / gap-page   = 24–32px
Nested subsections:  gap-group / gap-section  = 16–24px
Fields:              gap-micro / gap-field    = 4–12px
```

Do **not** do this:

```html
<section class="section">...</section>
<section class="section">...</section>
```

Do this:

```html
<div class="section-stack">
  <section class="section">...</section>
  <section class="section">...</section>
</div>
```

---

## 4. Tailwind v4 token setup

Create or update `app.css`, `globals.css`, or your main Tailwind entry file.

Important naming note: avoid naming a color `page` if you also have a font-size class like `text-page`. In Tailwind, `text-*` can refer to both color and font size. This guide uses `canvas` for the page background and `page-title` for the large text token to avoid conflicts.

```css
@import "tailwindcss";

@theme {
  /* Fonts */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, "Noto Sans", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  /* Type scale */
  --text-caption: 0.75rem;
  --text-caption--line-height: 1rem;
  --text-caption--letter-spacing: 0.02em;

  --text-ui: 0.875rem;
  --text-ui--line-height: 1.25rem;
  --text-ui--letter-spacing: 0.01em;

  --text-body: 1rem;
  --text-body--line-height: 1.5rem;

  --text-title: 1.25rem;
  --text-title--line-height: 1.75rem;

  --text-page-title: 1.5rem;
  --text-page-title--line-height: 2rem;

  /* Spacing scale */
  --spacing-micro: 0.25rem;   /* 4px */
  --spacing-tight: 0.5rem;    /* 8px */
  --spacing-field: 0.75rem;   /* 12px */
  --spacing-group: 1rem;      /* 16px */
  --spacing-section: 1.5rem;  /* 24px */
  --spacing-page: 2rem;       /* 32px */

  /* Control heights */
  --spacing-control-sm: 2rem; /* 32px, compact desktop only */
  --spacing-control: 2.5rem;  /* 40px, default dense input */
  --spacing-control-lg: 3rem; /* 48px, touch / mobile */

  /* Radius */
  --radius-control: 0.5rem;
  --radius-panel: 0.75rem;

  /* Semantic colors */
  --color-canvas: #0b0d12;
  --color-surface: #11141b;
  --color-surface-raised: #151922;
  --color-surface-hover: #1a202b;

  --color-fg: #e8ecf1;
  --color-fg-subtle: #b3bbc7;
  --color-fg-muted: #8d96a3;

  --color-line: #28313d;
  --color-line-strong: #5c6b7c;

  --color-focus: #7ab0ff;
  --color-danger: #ff6b6b;
  --color-success: #44d17a;
  --color-warning: #ffd166;
}
```

---

## 5. Base and component classes

```css
@layer base {
  html {
    font-family: var(--font-sans);
  }

  body {
    @apply bg-canvas text-fg text-ui antialiased;
  }

  *:focus-visible {
    @apply outline-2 outline-offset-2 outline-focus;
  }
}

@layer components {
  /* Page layout */
  .page-shell {
    @apply min-h-screen bg-canvas text-fg;
  }

  .page-container {
    @apply mx-auto w-full max-w-7xl px-group py-section md:px-page md:py-page;
  }

  .page-header {
    @apply mb-section space-y-tight;
  }

  .page-title {
    @apply text-title font-semibold tracking-normal text-fg md:text-page-title;
  }

  .page-description {
    @apply max-w-[72ch] text-ui text-fg-subtle;
  }

  /* Critical anti-glue class */
  .section-stack {
    @apply grid gap-section;
  }

  @media (min-width: 768px) {
    .section-stack {
      @apply gap-page;
    }
  }

  .section {
    @apply rounded-panel border border-line bg-surface p-group md:p-section;
  }

  .section-header {
    @apply mb-group space-y-micro;
  }

  .section-title {
    @apply text-body font-semibold tracking-normal text-fg;
  }

  .section-description {
    @apply max-w-[72ch] text-ui text-fg-subtle;
  }

  /* Nested cards inside a large section */
  .subsection-stack {
    @apply grid gap-group;
  }

  .subsection {
    @apply rounded-control border border-line bg-surface-raised p-group;
  }

  .subsection-header {
    @apply mb-field space-y-micro;
  }

  .subsection-title {
    @apply text-ui font-semibold text-fg;
  }

  .subsection-description {
    @apply text-caption text-fg-subtle;
  }

  /* Forms */
  .form-grid {
    @apply grid gap-field md:grid-cols-2 md:gap-group;
  }

  .field {
    @apply grid min-w-0 gap-micro;
  }

  .field-span-full {
    @apply md:col-span-2;
  }

  .label {
    @apply text-ui font-semibold text-fg;
  }

  .help,
  .meta {
    @apply max-w-[60ch] text-caption text-fg-subtle;
  }

  .validation {
    @apply max-w-[60ch] text-caption font-semibold text-danger;
  }

  .input,
  .select,
  .textarea {
    @apply min-h-control w-full rounded-control border border-line-strong bg-surface px-field py-tight text-ui text-fg;
  }

  .textarea {
    @apply min-h-control-lg resize-y;
  }

  .input::placeholder,
  .textarea::placeholder {
    @apply text-fg-muted;
  }

  .input:focus-visible,
  .select:focus-visible,
  .textarea:focus-visible {
    @apply outline-2 outline-offset-2 outline-focus;
  }

  .checkbox-row {
    @apply flex items-start gap-tight text-ui text-fg-subtle;
  }

  .checkbox {
    @apply mt-[0.1875rem] size-4 shrink-0 rounded border border-line-strong bg-surface;
  }

  /* Buttons */
  .button-row {
    @apply flex flex-wrap items-center gap-tight;
  }

  .button {
    @apply inline-flex min-h-control-sm items-center justify-center gap-tight rounded-control border border-line-strong px-field text-ui font-semibold text-fg;
  }

  .button-primary {
    @apply border-focus bg-focus text-canvas;
  }

  .button-secondary {
    @apply bg-surface hover:bg-surface-hover;
  }

  /* Data and code */
  .num {
    @apply text-right tabular-nums;
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: "tnum" 1, "lnum" 1;
  }

  .code,
  .id,
  .hash {
    @apply font-mono;
  }

  /* Tables */
  .table-wrap {
    @apply overflow-x-auto rounded-panel border border-line bg-surface;
  }

  .table {
    @apply w-full border-separate border-spacing-0;
  }

  .table th {
    @apply border-b border-line px-field py-tight text-left align-top text-caption font-semibold text-fg-subtle;
  }

  .table td {
    @apply border-b border-line px-field py-[0.625rem] align-top text-ui text-fg;
  }

  .table tr:last-child td {
    @apply border-b-0;
  }

  .table th.num,
  .table td.num {
    @apply text-right;
  }

  .table tbody tr:hover {
    @apply bg-surface-hover;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 6. Recommended layout for settings screens

Use this structure for admin settings pages.

```html
<div class="page-shell">
  <main class="page-container">
    <header class="page-header">
      <div class="button-row justify-between">
        <div class="space-y-tight">
          <h1 class="page-title">Firebase Cloud Messaging</h1>
          <p class="page-description">
            Send push notifications through Firebase. Mobile and web channels are configured independently.
          </p>
        </div>

        <div class="button-row">
          <button class="button button-secondary">Refresh</button>
          <button class="button button-primary">Save</button>
        </div>
      </div>
    </header>

    <div class="section-stack">
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Service account JSON</h2>
          <p class="section-description">
            Server-side secret for Firebase Admin SDK. It must never be exposed to the frontend.
          </p>
        </div>

        <div class="subsection-stack">
          <div class="subsection">
            <div class="button-row">
              <button class="button button-secondary">Upload JSON file</button>
            </div>
            <p class="help mt-tight">
              The file is read in the browser and sent to the server only when you click Save.
            </p>
          </div>

          <div class="subsection">
            <div class="subsection-header">
              <h3 class="subsection-title">Saved key</h3>
              <p class="subsection-description">Only non-sensitive metadata is displayed.</p>
            </div>

            <dl class="grid gap-tight text-caption md:grid-cols-2">
              <div>
                <dt class="text-fg-muted">project_id</dt>
                <dd class="code text-fg">gfcafe-ru</dd>
              </div>
              <div>
                <dt class="text-fg-muted">client_email</dt>
                <dd class="code text-fg">firebase-adminsdk-***@gfcafe-ru.iam.gserviceaccount.com</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Channel activation</h2>
          <p class="section-description">
            Each push channel is registered independently.
          </p>
        </div>

        <div class="subsection-stack">
          <label class="subsection checkbox-row">
            <input class="checkbox" type="checkbox" />
            <span>
              <span class="block font-semibold text-fg">Mobile push</span>
              <span class="block text-caption text-fg-subtle">Requires only the service account.</span>
            </span>
          </label>

          <label class="subsection checkbox-row">
            <input class="checkbox" type="checkbox" />
            <span>
              <span class="block font-semibold text-fg">Web push</span>
              <span class="block text-caption text-fg-subtle">Requires Firebase web config and VAPID keys.</span>
            </span>
          </label>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Web config and VAPID</h2>
          <p class="section-description">
            Public Firebase config for browser push notifications.
          </p>
        </div>

        <div class="form-grid">
          <div class="field">
            <label class="label" for="apiKey">apiKey</label>
            <input id="apiKey" class="input" />
            <p class="help">Firebase Console → Project settings → General → Your apps.</p>
          </div>

          <div class="field">
            <label class="label" for="projectId">projectId</label>
            <input id="projectId" class="input" />
            <p class="help">Firebase project identifier.</p>
          </div>

          <div class="field">
            <label class="label" for="messagingSenderId">messagingSenderId</label>
            <input id="messagingSenderId" class="input" />
          </div>

          <div class="field">
            <label class="label" for="appId">appId</label>
            <input id="appId" class="input" />
          </div>
        </div>
      </section>
    </div>
  </main>
</div>
```

---

## 7. Anti-patterns and fixes

### Anti-pattern: Cards touch each other

```html
<section class="section">...</section>
<section class="section">...</section>
<section class="section">...</section>
```

Fix:

```html
<div class="section-stack">
  <section class="section">...</section>
  <section class="section">...</section>
  <section class="section">...</section>
</div>
```

### Anti-pattern: Border is the only separator

```html
<div class="border border-line p-group">...</div>
<div class="border border-line p-group">...</div>
```

Fix:

```html
<div class="grid gap-section">
  <div class="rounded-panel border border-line bg-surface p-group">...</div>
  <div class="rounded-panel border border-line bg-surface p-group">...</div>
</div>
```

### Anti-pattern: Everything is `text-xs`

```html
<label class="text-xs text-zinc-400">apiKey</label>
<input class="text-xs" />
<p class="text-xs text-zinc-500">Firebase Console → Project settings.</p>
```

Fix:

```html
<label class="label">apiKey</label>
<input class="input" />
<p class="help">Firebase Console → Project settings.</p>
```

### Anti-pattern: Helper text is too close to the next field

```html
<div class="grid gap-1">
  <label>apiKey</label>
  <input />
  <p>Firebase Console → Project settings.</p>
  <label>projectId</label>
  <input />
</div>
```

Fix:

```html
<div class="form-grid">
  <div class="field">
    <label class="label">apiKey</label>
    <input class="input" />
    <p class="help">Firebase Console → Project settings.</p>
  </div>

  <div class="field">
    <label class="label">projectId</label>
    <input class="input" />
  </div>
</div>
```

---

## 8. Tailwind v3 fallback

If you are still on Tailwind v3, put the same values into `tailwind.config.js`.

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'Noto Sans', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        ui: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
        body: ['1rem', { lineHeight: '1.5rem' }],
        title: ['1.25rem', { lineHeight: '1.75rem' }],
        'page-title': ['1.5rem', { lineHeight: '2rem' }],
      },
      spacing: {
        micro: '0.25rem',
        tight: '0.5rem',
        field: '0.75rem',
        group: '1rem',
        section: '1.5rem',
        page: '2rem',
        'control-sm': '2rem',
        control: '2.5rem',
        'control-lg': '3rem',
      },
      borderRadius: {
        control: '0.5rem',
        panel: '0.75rem',
      },
      colors: {
        canvas: '#0b0d12',
        surface: '#11141b',
        'surface-raised': '#151922',
        'surface-hover': '#1a202b',
        fg: '#e8ecf1',
        'fg-subtle': '#b3bbc7',
        'fg-muted': '#8d96a3',
        line: '#28313d',
        'line-strong': '#5c6b7c',
        focus: '#7ab0ff',
        danger: '#ff6b6b',
        success: '#44d17a',
        warning: '#ffd166',
      },
    },
  },
  plugins: [],
};
```

The component classes from the v4 example can stay almost the same in your CSS file if you use `@tailwind base; @tailwind components; @tailwind utilities;` and `@layer components`.

---

## 9. Implementation checklist

Use this checklist when reviewing dense UI screens.

### Typography

- [ ] Main UI text, labels, inputs, and table cells use `text-ui` or larger.
- [ ] Helper, caption, and meta text use `text-caption`, not smaller.
- [ ] Long descriptions use `text-body` or are moved into a dedicated help block.
- [ ] Labels are visible; placeholders are not used as field names.
- [ ] Page and section titles are only one or two steps larger than body text.
- [ ] No random `text-[13px]`, `leading-[17px]`, `tracking-[-0.02em]` in working UI.

### Spacing

- [ ] Major sections are wrapped in `.section-stack`.
- [ ] Major sections have `gap-section` or `gap-page` between them.
- [ ] Nested panels use `.subsection-stack`.
- [ ] Fields use `.field` and parent grids use `gap-field` / `gap-group`.
- [ ] Borders are never the only separator between large cards.
- [ ] Random spacing like `p-[7px]`, `gap-[11px]`, `mt-[13px]` is avoided.

### Forms

- [ ] Form layout starts with one column and moves to two columns only when helper text still fits.
- [ ] Each field follows `label → control → helper/error`.
- [ ] Input height is at least `min-h-control` for desktop forms.
- [ ] Checkbox rows have enough vertical padding when they behave like selectable cards.
- [ ] Errors are text messages, not only red borders.

### Tables

- [ ] Table body uses `text-ui`.
- [ ] Header uses `text-caption font-semibold`.
- [ ] Numeric columns use `.num`.
- [ ] Numeric columns are right-aligned.
- [ ] IDs, hashes, and code fragments use `.code`, `.id`, or `.hash`.
- [ ] Text is wrapped before it is truncated.

### Accessibility

- [ ] Text contrast is readable in both dark and light themes.
- [ ] Focus state is visible.
- [ ] The screen works at 125%, 150%, and 200% browser zoom.
- [ ] Dense controls are not smaller than 24×24px for interactive targets.
- [ ] Reduced motion is respected.

---

## 10. Quick rules for developers

1. Use `text-ui` as the default working size.
2. Use `text-caption` only for secondary text, never for primary controls.
3. Use `.section-stack` for page-level blocks.
4. Use `.subsection-stack` for nested panels.
5. Use `.field` for label/control/helper groups.
6. Use borders plus gaps, not borders instead of gaps.
7. Use `tabular-nums` for numeric data.
8. Do not use all caps for normal admin labels.
9. Avoid arbitrary spacing unless there is a real reason.
10. When the UI feels glued together, first increase block gaps before changing fonts.

---

## 11. Minimal copy-paste package

If you only need the essential part, start with these classes:

```css
@layer components {
  .section-stack {
    @apply grid gap-section md:gap-page;
  }

  .section {
    @apply rounded-panel border border-line bg-surface p-group md:p-section;
  }

  .section-header {
    @apply mb-group space-y-micro;
  }

  .section-title {
    @apply text-body font-semibold text-fg;
  }

  .section-description {
    @apply max-w-[72ch] text-ui text-fg-subtle;
  }

  .subsection-stack {
    @apply grid gap-group;
  }

  .subsection {
    @apply rounded-control border border-line bg-surface-raised p-group;
  }

  .field {
    @apply grid gap-micro;
  }

  .label {
    @apply text-ui font-semibold text-fg;
  }

  .help {
    @apply max-w-[60ch] text-caption text-fg-subtle;
  }

  .input {
    @apply min-h-control w-full rounded-control border border-line-strong bg-surface px-field py-tight text-ui text-fg;
  }
}
```

Use it like this:

```html
<div class="section-stack">
  <section class="section">
    <div class="section-header">
      <h2 class="section-title">Service account JSON</h2>
      <p class="section-description">Server-side Firebase Admin SDK secret.</p>
    </div>

    <div class="subsection-stack">
      <div class="subsection">
        <div class="field">
          <label class="label">project_id</label>
          <input class="input" />
          <p class="help">Use the Firebase project identifier.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section-header">
      <h2 class="section-title">Channel activation</h2>
      <p class="section-description">Enable mobile or web push independently.</p>
    </div>
  </section>
</div>
```

This is the main anti-glue pattern for dense Tailwind interfaces.
