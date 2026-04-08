type NavTreeNode = {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    sortOrder: number;
    icon: string;
    urlPath?: string;
    targetBlank?: boolean;
    visible: boolean;
    children: NavTreeNode[];
};

type NewsCard = {
    category: string;
    title: string;
    description: string;
    href: string;
};

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getVisibleItems(items: NavTreeNode[]): NavTreeNode[] {
    return items.filter((item) => item.visible !== false);
}

function renderLeafLink(item: NavTreeNode, className: string): string {
    const label = escapeHtml(item.name);

    if (!item.urlPath) {
        return `<span class="${className}">${label}</span>`;
    }

    const href = escapeHtml(item.urlPath);
    const target = item.targetBlank ? ' target="_blank" rel="noreferrer"' : '';
    return `<a class="${className}" href="${href}"${target}>${label}</a>`;
}

function renderHorizontalMenu(items: NavTreeNode[]): string {
    const visibleItems = getVisibleItems(items);

    if (visibleItems.length === 0) {
        return '<p class="menu-empty">The header section is empty.</p>';
    }

    const nodes = visibleItems.map((item) => {
        const children = getVisibleItems(item.children ?? []);

        if (children.length === 0) {
            return `<li class="menu-inline-item menu-inline-single">${renderLeafLink(item, 'menu-top-link')}</li>`;
        }

        const links = children.map((child) =>
            `<li class="menu-child-item">${renderLeafLink(child, 'menu-child-link')}</li>`
        ).join('');

        return `<li class="menu-inline-item">
            <details class="menu-group">
                <summary>${escapeHtml(item.name)}</summary>
                <ul class="menu-child-list">${links}</ul>
            </details>
        </li>`;
    }).join('');

    return `<ul class="menu-inline-list">${nodes}</ul>`;
}

function createNewsCards(headerItems: NavTreeNode[]): NewsCard[] {
    const visibleItems = getVisibleItems(headerItems);
    const flattenedLinks = visibleItems.flatMap((item) => {
        const children = getVisibleItems(item.children ?? []);

        if (children.length > 0) {
            return children.map((child) => ({
                category: item.name,
                title: child.name,
                description: `A navigation-managed item from the "${item.name}" section.`,
                href: child.urlPath ?? '#',
            }));
        }

        return [{
            category: 'Navigation',
            title: item.name,
            description: 'A top-level navigation item available directly from the demo menu.',
            href: item.urlPath ?? '#',
        }];
    });

    const fallbackCards: NewsCard[] = [
        {
            category: 'Adminizer',
            title: 'Manage navigation from one place',
            description: 'Use the admin panel to reorder menu groups, links, and model-driven items.',
            href: '#',
        },
        {
            category: 'Fixture',
            title: 'Preview frontend structure',
            description: 'This page shows how stored navigation data can be rendered on a public-facing site.',
            href: '#',
        },
        {
            category: 'Demo',
            title: 'Connect content and navigation',
            description: 'Navigation sections can drive headers, footers, and landing page entry points.',
            href: '#',
        },
    ];

    return (flattenedLinks.length > 0 ? flattenedLinks : fallbackCards).slice(0, 3);
}

function renderNewsCards(cards: NewsCard[]): string {
    return cards.map((card) => `
        <article class="news-card">
            <p class="news-category">${escapeHtml(card.category)}</p>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.description)}</p>
            <a class="news-link" href="${escapeHtml(card.href)}">Open section</a>
        </article>
    `).join('');
}

function renderFooterLinks(items: NavTreeNode[]): string {
    const visibleItems = getVisibleItems(items);

    if (visibleItems.length === 0) {
        return '<p class="footer-empty">Footer navigation is empty.</p>';
    }

    return visibleItems.map((item) => {
        const children = getVisibleItems(item.children ?? []);

        if (children.length === 0) {
            return `<div class="footer-column">
                <h3>${escapeHtml(item.name)}</h3>
                <div class="footer-links">${renderLeafLink(item, 'footer-link')}</div>
            </div>`;
        }

        const childLinks = children.map((child) =>
            `<li>${renderLeafLink(child, 'footer-link')}</li>`
        ).join('');

        return `<div class="footer-column">
            <h3>${escapeHtml(item.name)}</h3>
            <ul class="footer-list">${childLinks}</ul>
        </div>`;
    }).join('');
}

export function renderIndexPage(
    routePrefix: string,
    navigation: { header: NavTreeNode[]; footer: NavTreeNode[] }
): string {
    const newsCards = createNewsCards(navigation.header);

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Adminizer Demo Page</title>
    <style>
        :root {
            color-scheme: light;
            --background: #f4efe6;
            --background-deep: #e7dbc7;
            --surface: rgba(255, 251, 245, 0.92);
            --surface-strong: #fffaf2;
            --text: #1f2937;
            --muted: #6b7280;
            --accent: #b45309;
            --accent-dark: #7c2d12;
            --line: rgba(124, 45, 18, 0.18);
            --shadow: rgba(60, 33, 19, 0.12);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            color: var(--text);
            font-family: Georgia, "Times New Roman", serif;
            background:
                linear-gradient(180deg, rgba(255, 248, 235, 0.96), rgba(244, 239, 230, 0.98)),
                radial-gradient(circle at top left, rgba(180, 83, 9, 0.14), transparent 24%),
                radial-gradient(circle at bottom right, rgba(124, 45, 18, 0.12), transparent 28%);
        }
        a {
            color: inherit;
        }
        main {
            width: min(1160px, calc(100% - 32px));
            margin: 0 auto;
            padding: 32px 0 64px;
        }
        .hero {
            padding: 40px;
            border: 1px solid var(--line);
            border-radius: 28px;
            background:
                linear-gradient(135deg, rgba(255, 250, 242, 0.96), rgba(239, 227, 208, 0.88));
            box-shadow: 0 24px 60px var(--shadow);
        }
        .eyebrow {
            margin: 0 0 10px;
            color: var(--accent-dark);
            letter-spacing: 0.16em;
            text-transform: uppercase;
            font-size: 12px;
        }
        h1, h2, h3, p {
            margin-top: 0;
        }
        h1 {
            margin-bottom: 14px;
            font-size: clamp(36px, 6vw, 66px);
            line-height: 0.96;
        }
        .hero-copy {
            max-width: 740px;
            font-size: 20px;
            line-height: 1.65;
            color: #374151;
        }
        .hero-actions {
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
            margin-top: 26px;
            align-items: center;
        }
        .hero-actions a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 48px;
            padding: 0 18px;
            border-radius: 999px;
            text-decoration: none;
            border: 1px solid var(--line);
            background: var(--surface-strong);
        }
        .hero-actions .primary {
            background: var(--accent-dark);
            color: #fff;
            border-color: var(--accent-dark);
        }
        .login-hint {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-height: 48px;
            padding: 10px 16px;
            border-radius: 18px;
            border: 1px solid var(--line);
            background: rgba(255, 251, 245, 0.78);
            color: #374151;
        }
        .login-hint strong {
            font-size: 13px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--accent-dark);
        }
        .login-hint code {
            background: transparent;
            padding: 0;
        }
        .hero-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 22px;
            margin-top: 26px;
        }
        .hero-side {
            padding: 22px;
            border-radius: 22px;
            border: 1px solid var(--line);
            background: rgba(255, 251, 245, 0.72);
        }
        .hero-side p:last-child {
            margin-bottom: 0;
        }
        .page-section {
            margin-top: 28px;
            padding: 26px;
            border: 1px solid var(--line);
            border-radius: 24px;
            background: var(--surface);
            box-shadow: 0 18px 40px rgba(60, 33, 19, 0.06);
        }
        .section-lead {
            max-width: 760px;
            color: var(--muted);
            line-height: 1.65;
        }
        .menu-shell {
            max-width: 980px;
            margin: 28px auto 0;
            padding: 20px;
            border-radius: 24px;
            background: linear-gradient(180deg, #f9f1e3, #fffaf3);
            border: 1px solid var(--line);
        }
        .menu-inline-list {
            display: flex;
            align-items: stretch;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
            list-style: none;
            margin: 0;
            padding: 0;
        }
        .menu-inline-item {
            position: relative;
        }
        .menu-group,
        .menu-inline-single {
            border: 1px solid var(--line);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.78);
        }
        .menu-group summary,
        .menu-top-link {
            display: block;
            padding: 16px 22px;
            font-size: 21px;
            text-decoration: none;
            cursor: pointer;
            white-space: nowrap;
        }
        .menu-group summary {
            list-style: none;
        }
        .menu-group summary::-webkit-details-marker {
            display: none;
        }
        .menu-group[open] summary {
            color: var(--accent-dark);
        }
        .menu-child-list {
            list-style: none;
            margin: 10px 0 0;
            padding: 10px;
            min-width: 220px;
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 5;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: rgba(255, 250, 242, 0.98);
            box-shadow: 0 20px 40px rgba(60, 33, 19, 0.12);
        }
        .menu-child-item + .menu-child-item {
            margin-top: 8px;
        }
        .menu-child-link {
            display: block;
            padding: 10px 12px;
            border-radius: 12px;
            text-decoration: none;
            background: rgba(180, 83, 9, 0.08);
        }
        .menu-empty,
        .footer-empty {
            color: var(--muted);
            font-style: italic;
        }
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 18px;
            margin-top: 22px;
        }
        .news-card {
            min-height: 240px;
            padding: 22px;
            border-radius: 22px;
            border: 1px solid var(--line);
            background:
                linear-gradient(180deg, rgba(255, 250, 242, 0.98), rgba(244, 233, 214, 0.9));
        }
        .news-category {
            margin-bottom: 14px;
            color: var(--accent-dark);
            text-transform: uppercase;
            letter-spacing: 0.14em;
            font-size: 12px;
        }
        .news-card h3 {
            margin-bottom: 12px;
            font-size: 28px;
            line-height: 1.1;
        }
        .news-card p {
            color: #4b5563;
            line-height: 1.65;
        }
        .news-link {
            display: inline-block;
            margin-top: 16px;
            text-decoration: none;
            border-bottom: 1px solid currentColor;
        }
        .footer-panel {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 26px;
            align-items: start;
        }
        .footer-brand {
            padding-right: 10px;
        }
        .footer-brand p {
            color: var(--muted);
            line-height: 1.7;
        }
        .footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 18px;
        }
        .footer-column {
            padding: 18px;
            border-radius: 18px;
            border: 1px solid var(--line);
            background: rgba(255, 250, 242, 0.72);
        }
        .footer-column h3 {
            margin-bottom: 12px;
            font-size: 20px;
        }
        .footer-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        .footer-list li + li {
            margin-top: 10px;
        }
        .footer-link {
            text-decoration: none;
            color: #374151;
        }
        code {
            padding: 2px 7px;
            border-radius: 7px;
            background: var(--background-deep);
        }
        @media (max-width: 860px) {
            .hero,
            .page-section {
                padding: 22px;
            }
            .hero-grid,
            .footer-panel {
                grid-template-columns: 1fr;
            }
            .menu-group summary,
            .menu-single-link {
                font-size: 21px;
            }
        }
    </style>
</head>
<body>
    <main>
        <section class="hero">
            <p class="eyebrow">Adminizer demo</p>
            <h1>Demo page for Adminizer-managed navigation and content structure</h1>
            <p class="hero-copy">
                This is a public demo page for Adminizer. Here you can open the admin area, manage navigation data,
                and immediately see one possible way the same content may look on a website.
            </p>
            <div class="hero-actions">
                <a class="primary" href="${routePrefix}">Open Adminizer</a>
                <a class="primary" href="https://github.com/adminization/adminizer" target="_blank" rel="noreferrer">View on GitHub</a>
                <div class="login-hint">
                    <strong>Demo access</strong>
                    <span>login: <code>demo</code> | password: <code>demo</code></span>
                </div>
            </div>
            <div class="hero-grid">
                <div class="hero-side">
                    <h2>How to use the demo</h2>
                    <p>
                        Open Adminizer, edit navigation items, groups, and links, then refresh this page to compare
                        the management view with a simple frontend presentation.
                    </p>
                </div>
            </div>
        </section>

        <section class="page-section" id="demo-menu">
            <p class="eyebrow">Header preview</p>
            <h2>Horizontal expandable menu in the center of the page</h2>
            <p class="section-lead">
                Below is a simple demonstration of a centered horizontal menu. It uses the <code>header</code>
                navigation section and presents top-level items as dropdown groups.
            </p>
            <div class="menu-shell">
                ${renderHorizontalMenu(navigation.header)}
            </div>
        </section>

        <section class="page-section">
            <p class="eyebrow">Content demo</p>
            <h2>Example news hub driven by navigation-managed data</h2>
            <p class="section-lead">
                This middle section imitates a landing page area such as news, articles, or editorial highlights.
                The cards below are built from available navigation items so the demo page feels closer to a real site.
            </p>
            <div class="news-grid">
                ${renderNewsCards(newsCards)}
            </div>
        </section>

        <section class="page-section" id="demo-footer">
            <p class="eyebrow">Footer preview</p>
            <h2>Simple footer layout</h2>
            <div class="footer-panel">
                <div class="footer-brand">
                    <p>
                        This lower block shows a lightweight footer example. It is intentionally simple: one text
                        column on the left and navigation-driven footer columns on the right.
                    </p>
                    <p>
                        Use it as a basic reference for how data managed through Adminizer can be mapped to a public
                        website layout.
                    </p>
                </div>
                <div class="footer-grid">
                    ${renderFooterLinks(navigation.footer)}
                </div>
            </div>
        </section>
    </main>
</body>
</html>`;
}

export type { NavTreeNode };
