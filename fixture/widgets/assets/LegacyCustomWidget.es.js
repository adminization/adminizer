var l = { exports: {} }, r = {};
var x;
function m() {
  if (x) return r;
  x = 1;
  var u = /* @__PURE__ */ Symbol.for("react.transitional.element"), o = /* @__PURE__ */ Symbol.for("react.fragment");
  function n(d, t, e) {
    var i = null;
    if (e !== void 0 && (i = "" + e), t.key !== void 0 && (i = "" + t.key), "key" in t) {
      e = {};
      for (var a in t)
        a !== "key" && (e[a] = t[a]);
    } else e = t;
    return t = e.ref, {
      $$typeof: u,
      type: d,
      key: i,
      ref: t !== void 0 ? t : null,
      props: e
    };
  }
  return r.Fragment = o, r.jsx = n, r.jsxs = n, r;
}
var c;
function p() {
  return c || (c = 1, l.exports = m()), l.exports;
}
var s = p();
const R = window.React.useState, f = window.UIComponents.Button;
function v() {
  const [u, o] = R(0);
  return /* @__PURE__ */ s.jsxs("div", { className: "flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-neutral-900", children: [
    /* @__PURE__ */ s.jsx("div", { className: "text-sm font-medium uppercase tracking-normal text-neutral-600", children: "Legacy counter" }),
    /* @__PURE__ */ s.jsx("div", { className: "text-4xl font-bold tabular-nums", children: u }),
    /* @__PURE__ */ s.jsx(f, { type: "button", size: "sm", onClick: () => o((n) => n + 1), children: "Increment" })
  ] });
}
export {
  v as default
};
