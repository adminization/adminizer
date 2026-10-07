var u = { exports: {} }, t = {};
var d;
function p() {
  if (d) return t;
  d = 1;
  var s = /* @__PURE__ */ Symbol.for("react.transitional.element"), l = /* @__PURE__ */ Symbol.for("react.fragment");
  function a(c, r, e) {
    var i = null;
    if (e !== void 0 && (i = "" + e), r.key !== void 0 && (i = "" + r.key), "key" in r) {
      e = {};
      for (var o in r)
        o !== "key" && (e[o] = r[o]);
    } else e = r;
    return r = e.ref, {
      $$typeof: s,
      type: c,
      key: i,
      ref: r !== void 0 ? r : null,
      props: e
    };
  }
  return t.Fragment = l, t.jsx = a, t.jsxs = a, t;
}
var x;
function v() {
  return x || (x = 1, u.exports = p()), u.exports;
}
var n = v();
const R = {
  margin: "0 auto 6px",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  background: "var(--sidebar-accent)",
  color: "var(--sidebar-accent-foreground)"
};
function E({ Default: s }) {
  return /* @__PURE__ */ n.jsxs(n.Fragment, { children: [
    /* @__PURE__ */ n.jsx("div", { style: R, className: "group-data-[state=collapsed]:hidden", children: "Fixture environment" }),
    /* @__PURE__ */ n.jsx(s, {})
  ] });
}
export {
  E as SidebarFooter
};
