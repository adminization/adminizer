var R = { exports: {} }, f = {};
var k;
function M() {
  if (k) return f;
  k = 1;
  var e = /* @__PURE__ */ Symbol.for("react.transitional.element"), t = /* @__PURE__ */ Symbol.for("react.fragment");
  function r(n, s, o) {
    var i = null;
    if (o !== void 0 && (i = "" + o), s.key !== void 0 && (i = "" + s.key), "key" in s) {
      o = {};
      for (var c in s)
        c !== "key" && (o[c] = s[c]);
    } else o = s;
    return s = o.ref, {
      $$typeof: e,
      type: n,
      key: i,
      ref: s !== void 0 ? s : null,
      props: o
    };
  }
  return f.Fragment = t, f.jsx = r, f.jsxs = r, f;
}
var A;
function P() {
  return A || (A = 1, R.exports = M()), R.exports;
}
var a = P();
const q = window.InertiajsReact.http, H = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0"
}, J = (e) => ({
  ...e ?? {},
  _ts: Date.now()
}), _ = (e) => {
  if (e === "")
    return "";
  try {
    return JSON.parse(e);
  } catch {
    return e;
  }
}, I = (e) => {
  if (typeof e != "string")
    return !1;
  const t = e.trim().toLowerCase();
  return t.startsWith("<!doctype html") || t.startsWith("<html") || t.startsWith("<");
}, B = (e) => {
  const t = {};
  return e.forEach((r, n) => {
    t[n.toLowerCase()] = r;
  }), t;
}, O = (e) => {
  if (typeof document > "u")
    return;
  const t = document.cookie.split("; ").find((r) => r.startsWith(`${encodeURIComponent(e)}=`));
  return t ? decodeURIComponent(t.split("=").slice(1).join("=")) : void 0;
}, N = (e, t) => {
  const r = new URL(e, window.location.origin);
  return Object.entries(J(t)).forEach(([n, s]) => {
    if (s != null) {
      if (Array.isArray(s)) {
        s.forEach((o) => r.searchParams.append(n, String(o)));
        return;
      }
      r.searchParams.set(n, String(s));
    }
  }), `${r.pathname}${r.search}${r.hash}`;
}, W = async (e, t, r, n) => {
  const s = O("XSRF-TOKEN"), o = new Headers(H);
  o.set("X-Requested-With", "XMLHttpRequest"), s && o.set("x-xsrf-token", s), Object.entries(n?.headers ?? {}).forEach(([p, m]) => {
    m != null && o.set(p, String(m));
  });
  let i;
  r instanceof FormData ? i = r : r != null && (i = typeof r == "string" ? r : JSON.stringify(r), o.has("Content-Type") || o.set("Content-Type", "application/json"));
  const c = await fetch(N(t, n?.params), {
    method: e.toUpperCase(),
    body: i,
    headers: o,
    credentials: "same-origin",
    signal: n?.signal
  }), d = B(c.headers);
  let u;
  switch (n?.responseType) {
    case "arraybuffer":
      u = await c.arrayBuffer();
      break;
    case "document": {
      const p = await c.text(), m = new DOMParser(), l = d["content-type"]?.includes("xml") ? "application/xml" : "text/html";
      u = m.parseFromString(p, l);
      break;
    }
    default:
      u = await c.blob();
      break;
  }
  const h = {
    data: u,
    status: c.status,
    headers: d
  };
  if (!c.ok) {
    const p = new Error(`Request failed with status ${c.status}`);
    throw p.response = h, p;
  }
  return h;
}, w = async (e, t, r, n) => {
  if (n?.responseType && n.responseType !== "json" && n.responseType !== "text")
    return W(e, t, r, n);
  const s = await q.getClient().request({
    method: e,
    url: t,
    data: r,
    params: J(n?.params),
    headers: {
      ...H,
      ...n?.headers ?? {}
    },
    signal: n?.signal
  });
  return {
    data: _(s.data),
    status: s.status,
    headers: s.headers
  };
}, y = async (e, t, r, n) => {
  try {
    const s = await w(e, t, r, n), o = String(s.headers?.["content-type"] ?? "").toLowerCase();
    if (o && !o.includes("application/json") || I(s.data))
      throw new Error(
        `Expected JSON response from "${t}", but received "${o || "unknown"}". This usually means the session expired and server returned an HTML login page.`
      );
    return s;
  } catch (s) {
    const o = s, i = String(o.response?.headers?.["content-type"] ?? "").toLowerCase();
    throw I(o.response?.data) || i.includes("text/html") ? new Error(
      "Server returned HTML instead of JSON. Most likely auth session expired. Please reload the page and log in again."
    ) : s;
  }
}, g = {
  get: (e, t) => w("get", e, void 0, t),
  post: (e, t, r) => w("post", e, t, r),
  put: (e, t, r) => w("put", e, t, r),
  patch: (e, t, r) => w("patch", e, t, r),
  delete: (e, t, r) => w("delete", e, t, r),
  getJson: (e, t) => y("get", e, void 0, t),
  postJson: (e, t, r) => y("post", e, t, r),
  putJson: (e, t, r) => y("put", e, t, r),
  patchJson: (e, t, r) => y("patch", e, t, r),
  deleteJson: (e, t, r) => y("delete", e, t, r)
}, F = "axios-compat is a legacy compatibility API. Please use adminApi from @/lib/admin-api instead.", x = () => {
  console.log(F);
};
x();
const C = (e) => {
  if (typeof e == "object" && e !== null && "isAxiosError" in e)
    return e;
  const t = e instanceof Error ? e.message : "Request failed", r = new Error(t);
  r.isAxiosError = !0;
  const n = e.response;
  return n && (r.response = n), r;
}, D = {
  async get(e, t) {
    x();
    try {
      return await g.get(e, t);
    } catch (r) {
      throw C(r);
    }
  },
  async post(e, t, r) {
    x();
    try {
      return await g.post(e, t, r);
    } catch (n) {
      throw C(n);
    }
  },
  async put(e, t, r) {
    x();
    try {
      return await g.put(e, t, r);
    } catch (n) {
      throw C(n);
    }
  },
  async patch(e, t, r) {
    x();
    try {
      return await g.patch(e, t, r);
    } catch (n) {
      throw C(n);
    }
  },
  async delete(e, t) {
    x();
    try {
      return await g.delete(e, t?.data, t);
    } catch (r) {
      throw C(r);
    }
  },
  isAxiosError(e) {
    return !!(e && typeof e == "object" && "isAxiosError" in e);
  }
}, E = window.React;
var z = (e, t, r, n, s, o, i, c) => {
  let d = document.documentElement, u = ["light", "dark"];
  function h(l) {
    (Array.isArray(e) ? e : [e]).forEach((b) => {
      let v = b === "class", L = v && o ? s.map((S) => o[S] || S) : s;
      v ? (d.classList.remove(...L), d.classList.add(o && o[l] ? o[l] : l)) : d.setAttribute(b, l);
    }), p(l);
  }
  function p(l) {
    c && u.includes(l) && (d.style.colorScheme = l);
  }
  function m() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (n) h(n);
  else try {
    let l = localStorage.getItem(t) || r, b = i && l === "system" ? m() : l;
    h(b);
  } catch {
  }
}, X = E.createContext(void 0), Y = { setTheme: (e) => {
}, themes: [] }, G = () => {
  var e;
  return (e = E.useContext(X)) != null ? e : Y;
};
E.memo(({ forcedTheme: e, storageKey: t, attribute: r, enableSystem: n, enableColorScheme: s, defaultTheme: o, value: i, themes: c, nonce: d, scriptProps: u }) => {
  let h = JSON.stringify([r, t, o, e, c, i, n, s]).slice(1, -1);
  return E.createElement("script", { ...u, suppressHydrationWarning: !0, nonce: typeof window > "u" ? d : "", dangerouslySetInnerHTML: { __html: `(${z.toString()})(${h})` } });
});
const Q = window.sonner.Toaster, V = ({ ...e }) => {
  const { theme: t = "system" } = G();
  return /* @__PURE__ */ a.jsx(
    Q,
    {
      theme: t,
      className: "toaster group",
      style: {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)"
      },
      ...e
    }
  );
}, Z = window.React.useState, K = window.UIComponents.Button, ee = window.UIComponents.Table, te = window.UIComponents.TableBody, T = window.UIComponents.TableCell, j = window.UIComponents.TableHead, re = window.UIComponents.TableHeader, U = window.UIComponents.TableRow, se = window.UIComponents.Card, ne = window.UIComponents.CardContent, oe = window.UIComponents.CardHeader, ae = window.UIComponents.CardTitle, $ = window.sonner.toast, ie = window.InertiajsReact.router;
function ce({ data: e }) {
  const [t, r] = Z(e.modules), n = async (s, o) => {
    const i = o === "enabled" ? "disable" : "enable";
    try {
      await D.post(`${window.routePrefix}/module-manager/${i}`, { name: s }), $.success(`Модуль ${s} успешно ${i === "enable" ? "включён" : "выключен"}.`), r(
        (c) => c.map(
          (d) => d.name === s ? { ...d, state: i === "enable" ? "enabled" : "disabled" } : d
        )
      ), ie.reload();
    } catch {
      $.error(`Ошибка при ${i === "enable" ? "включении" : "выключении"} модуля ${s}.`);
    }
  };
  return /* @__PURE__ */ a.jsxs(a.Fragment, { children: [
    /* @__PURE__ */ a.jsx(V, { position: "top-center", richColors: !0, closeButton: !0 }),
    /* @__PURE__ */ a.jsxs(se, { children: [
      /* @__PURE__ */ a.jsx(oe, { children: /* @__PURE__ */ a.jsx(ae, { children: "Менеджер модулей" }) }),
      /* @__PURE__ */ a.jsx(ne, { children: /* @__PURE__ */ a.jsxs(ee, { children: [
        /* @__PURE__ */ a.jsx(re, { children: /* @__PURE__ */ a.jsxs(U, { children: [
          /* @__PURE__ */ a.jsx(j, { children: "Имя" }),
          /* @__PURE__ */ a.jsx(j, { children: "Версия" }),
          /* @__PURE__ */ a.jsx(j, { children: "Статус" }),
          /* @__PURE__ */ a.jsx(j, { children: "Действия" })
        ] }) }),
        /* @__PURE__ */ a.jsx(te, { children: t.map((s) => /* @__PURE__ */ a.jsxs(U, { children: [
          /* @__PURE__ */ a.jsx(T, { children: s.name }),
          /* @__PURE__ */ a.jsx(T, { children: s.version }),
          /* @__PURE__ */ a.jsx(T, { children: /* @__PURE__ */ a.jsx(
            "span",
            {
              className: `px-2 py-1 rounded text-xs font-medium ${s.state === "enabled" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`,
              children: s.state
            }
          ) }),
          /* @__PURE__ */ a.jsx(T, { children: /* @__PURE__ */ a.jsx(
            K,
            {
              onClick: () => n(s.name, s.state),
              variant: s.state === "enabled" ? "destructive" : "default",
              size: "sm",
              children: s.state === "enabled" ? "Выключить" : "Включить"
            }
          ) })
        ] }, s.name)) })
      ] }) })
    ] })
  ] });
}
export {
  ce as default
};
