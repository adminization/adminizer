var x = { exports: {} }, i = {};
var a;
function p() {
  if (a) return i;
  a = 1;
  var s = /* @__PURE__ */ Symbol.for("react.transitional.element"), r = /* @__PURE__ */ Symbol.for("react.fragment");
  function o(c, t, n) {
    var d = null;
    if (n !== void 0 && (d = "" + n), t.key !== void 0 && (d = "" + t.key), "key" in t) {
      n = {};
      for (var l in t)
        l !== "key" && (n[l] = t[l]);
    } else n = t;
    return t = n.ref, {
      $$typeof: s,
      type: c,
      key: d,
      ref: t !== void 0 ? t : null,
      props: n
    };
  }
  return i.Fragment = r, i.jsx = o, i.jsxs = o, i;
}
var u;
function h() {
  return u || (u = 1, x.exports = p()), x.exports;
}
var e = h();
const j = window.InertiajsReact.Link, C = window.UIComponents.Card, m = window.UIComponents.CardContent, R = window.UIComponents.CardHeader, f = window.UIComponents.CardTitle, w = window.AdminizerShell.useAdminContext;
function v({ data: s }) {
  const { context: r } = w();
  return /* @__PURE__ */ e.jsxs(C, { children: [
    /* @__PURE__ */ e.jsx(R, { children: /* @__PURE__ */ e.jsx(f, { children: s.title }) }),
    /* @__PURE__ */ e.jsxs(m, { children: [
      /* @__PURE__ */ e.jsx("p", { children: s.text }),
      s.links?.map((o) => /* @__PURE__ */ e.jsx("p", { style: { marginTop: 8 }, children: /* @__PURE__ */ e.jsx(j, { href: o.href, style: { textDecoration: "underline" }, children: o.title }) }, o.href)),
      /* @__PURE__ */ e.jsxs("p", { style: { opacity: 0.6, marginTop: 8, fontSize: 13 }, children: [
        "context: ",
        /* @__PURE__ */ e.jsx("code", { children: r?.id }),
        " · prefix: ",
        /* @__PURE__ */ e.jsx("code", { children: r?.prefix }),
        " · layout root: ",
        /* @__PURE__ */ e.jsx("code", { children: r?.layout.root }),
        r?.layout.layers.length ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
          " · layers: ",
          /* @__PURE__ */ e.jsx("code", { children: r.layout.layers.length })
        ] }) : null
      ] })
    ] })
  ] });
}
export {
  v as default
};
