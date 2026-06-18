var d = { exports: {} }, s = {};
var l;
function m() {
  if (l) return s;
  l = 1;
  var r = /* @__PURE__ */ Symbol.for("react.transitional.element"), o = /* @__PURE__ */ Symbol.for("react.fragment");
  function a(x, e, t) {
    var u = null;
    if (t !== void 0 && (u = "" + t), e.key !== void 0 && (u = "" + e.key), "key" in e) {
      t = {};
      for (var i in e)
        i !== "key" && (t[i] = e[i]);
    } else t = e;
    return e = t.ref, {
      $$typeof: r,
      type: x,
      key: u,
      ref: e !== void 0 ? e : null,
      props: t
    };
  }
  return s.Fragment = o, s.jsx = a, s.jsxs = a, s;
}
var c;
function p() {
  return c || (c = 1, d.exports = m()), d.exports;
}
var n = p();
const R = window.React.useMemo, v = window.React.useState, f = window.JSComponents.HandsonTable, h = [
  { feature: "window.JSComponents", status: "loaded", value: 1 },
  { feature: "HandsonTable", status: "rendered", value: 2 },
  { feature: "production asset", status: "checked", value: 3 }
];
function w() {
  const [r, o] = v(h), a = R(() => ({
    colHeaders: ["Feature", "Status", "Value"],
    columns: [
      { data: "feature", type: "text" },
      { data: "status", type: "text" },
      { data: "value", type: "numeric" }
    ],
    rowHeaders: !0,
    stretchH: "all",
    height: 320,
    width: "100%",
    licenseKey: "non-commercial-and-evaluation"
  }), []);
  return /* @__PURE__ */ n.jsxs("section", { className: "space-y-4", children: [
    /* @__PURE__ */ n.jsxs("div", { children: [
      /* @__PURE__ */ n.jsx("h1", { className: "text-xl font-semibold", children: "Handsontable Test" }),
      /* @__PURE__ */ n.jsx("p", { className: "text-sm text-muted-foreground", children: "Source: @/js-components/handsontable" })
    ] }),
    /* @__PURE__ */ n.jsx(
      f,
      {
        data: r,
        config: a,
        onChange: o
      }
    )
  ] });
}
export {
  w as default
};
