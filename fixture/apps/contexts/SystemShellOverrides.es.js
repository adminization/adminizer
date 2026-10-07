var d = { exports: {} }, i = {};
var u;
function p() {
  if (u) return i;
  u = 1;
  var n = /* @__PURE__ */ Symbol.for("react.transitional.element"), o = /* @__PURE__ */ Symbol.for("react.fragment");
  function s(c, e, r) {
    var a = null;
    if (r !== void 0 && (a = "" + r), e.key !== void 0 && (a = "" + e.key), "key" in e) {
      r = {};
      for (var x in e)
        x !== "key" && (r[x] = e[x]);
    } else r = e;
    return e = r.ref, {
      $$typeof: n,
      type: c,
      key: a,
      ref: e !== void 0 ? e : null,
      props: r
    };
  }
  return i.Fragment = o, i.jsx = s, i.jsxs = s, i;
}
var l;
function m() {
  return l || (l = 1, d.exports = p()), d.exports;
}
var t = m();
const R = window.InertiajsReact.Link, f = window.AdminizerShell.MaterialIcon, j = window.AdminizerShell.useAdminContext;
function v({ Default: n, ...o }) {
  const { context: s } = j();
  return /* @__PURE__ */ t.jsxs(t.Fragment, { children: [
    /* @__PURE__ */ t.jsxs(R, { href: `${s?.prefix}/settings`, style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 6,
      fontSize: 13,
      background: "var(--sidebar-accent)",
      whiteSpace: "nowrap",
      flexShrink: 0
    }, children: [
      /* @__PURE__ */ t.jsx(f, { name: "tune", className: "!text-[18px]" }),
      "System settings"
    ] }),
    /* @__PURE__ */ t.jsx(n, { ...o })
  ] });
}
function h({ Default: n }) {
  return /* @__PURE__ */ t.jsxs(t.Fragment, { children: [
    /* @__PURE__ */ t.jsx(n, {}),
    /* @__PURE__ */ t.jsx("div", { style: { textAlign: "center", fontSize: 11, opacity: 0.6 }, className: "group-data-[state=collapsed]:hidden", children: "System context" })
  ] });
}
export {
  v as HeaderActions,
  h as SidebarFooter
};
