var c = { exports: {} }, s = {};
var p;
function v() {
  if (p) return s;
  p = 1;
  var l = /* @__PURE__ */ Symbol.for("react.transitional.element"), d = /* @__PURE__ */ Symbol.for("react.fragment");
  function a(u, e, n) {
    var i = null;
    if (n !== void 0 && (i = "" + n), e.key !== void 0 && (i = "" + e.key), "key" in e) {
      n = {};
      for (var o in e)
        o !== "key" && (n[o] = e[o]);
    } else n = e;
    return e = n.ref, {
      $$typeof: l,
      type: u,
      key: i,
      ref: e !== void 0 ? e : null,
      props: n
    };
  }
  return s.Fragment = d, s.jsx = a, s.jsxs = a, s;
}
var h;
function g() {
  return h || (h = 1, c.exports = v()), c.exports;
}
var r = g();
const R = window.InertiajsReact.Link, j = window.InertiajsReact.usePage, k = window.AdminizerShell.useAdminContext, y = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  height: 52,
  padding: "0 20px",
  background: "#18181b",
  color: "#fafafa",
  fontSize: 14,
  flexShrink: 0,
  // Narrow screens scroll the bar instead of overflowing the page.
  overflowX: "auto",
  whiteSpace: "nowrap"
}, w = {
  background: "#27272a",
  color: "inherit",
  border: "1px solid #3f3f46",
  borderRadius: 6,
  padding: "4px 8px"
};
function m({ children: l }) {
  const { auth: d, logout: a, logoutBtn: u } = j().props, { context: e, contexts: n, menu: i, isActive: o, switchTo: f } = k();
  return /* @__PURE__ */ r.jsxs("div", { style: { display: "flex", flexDirection: "column", height: "100svh" }, children: [
    /* @__PURE__ */ r.jsxs("header", { style: y, children: [
      /* @__PURE__ */ r.jsx("strong", { style: { letterSpacing: 1 }, children: "▶ STUDIO" }),
      /* @__PURE__ */ r.jsx("nav", { style: { display: "flex", gap: 4, flex: 1 }, children: i.map((t) => {
        const x = o(t.link);
        return /* @__PURE__ */ r.jsx(R, { href: t.link, style: {
          padding: "6px 12px",
          borderRadius: 6,
          background: x ? "#fafafa" : "transparent",
          color: x ? "#18181b" : "inherit"
        }, children: t.title }, t.id);
      }) }),
      /* @__PURE__ */ r.jsx("select", { style: w, value: e?.id, onChange: (t) => f(t.target.value), children: n.map((t) => /* @__PURE__ */ r.jsx("option", { value: t.id, children: t.title }, t.id)) }),
      /* @__PURE__ */ r.jsx("span", { style: { opacity: 0.7 }, children: d?.user?.login }),
      /* @__PURE__ */ r.jsx("a", { href: a, style: { opacity: 0.7 }, children: u })
    ] }),
    /* @__PURE__ */ r.jsx("main", { "data-scroll-region": "content", style: { flex: 1, minHeight: 0, overflowY: "auto", background: "var(--background)" }, children: l })
  ] });
}
export {
  m as Layout
};
