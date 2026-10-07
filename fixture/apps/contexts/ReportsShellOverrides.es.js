var l = { exports: {} }, o = {};
var u;
function p() {
  if (u) return o;
  u = 1;
  var t = /* @__PURE__ */ Symbol.for("react.transitional.element"), s = /* @__PURE__ */ Symbol.for("react.fragment");
  function a(i, n, r) {
    var d = null;
    if (r !== void 0 && (d = "" + r), n.key !== void 0 && (d = "" + n.key), "key" in n) {
      r = {};
      for (var c in n)
        c !== "key" && (r[c] = n[c]);
    } else r = n;
    return n = r.ref, {
      $$typeof: t,
      type: i,
      key: d,
      ref: n !== void 0 ? n : null,
      props: r
    };
  }
  return o.Fragment = s, o.jsx = a, o.jsxs = a, o;
}
var x;
function j() {
  return x || (x = 1, l.exports = p()), l.exports;
}
var e = j();
const h = window.React.useState, m = window.InertiajsReact.Link, R = window.AdminizerShell.MaterialIcon, v = window.AdminizerShell.useAdminContext;
function k({ Default: t, ...s }) {
  const { menu: a, isActive: i } = v(), n = a.flatMap((r) => r.actions?.length ? r.actions : [r]);
  return /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
    /* @__PURE__ */ e.jsx(t, { ...s }),
    /* @__PURE__ */ e.jsx("nav", { className: "reports-rail", "aria-label": "Reports", children: n.map((r) => /* @__PURE__ */ e.jsx(
      m,
      {
        href: r.link,
        title: r.title,
        className: i(r.link) ? "reports-rail-active" : void 0,
        children: /* @__PURE__ */ e.jsx(R, { name: r.icon ?? "description", className: "!text-[20px]" })
      },
      r.id
    )) })
  ] });
}
function f({ Default: t }) {
  return /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
    /* @__PURE__ */ e.jsx(t, {}),
    /* @__PURE__ */ e.jsx("div", { className: "reports-caption group-data-[state=collapsed]:hidden", children: "Analytics workspace" })
  ] });
}
function S({ Default: t }) {
  const [s, a] = h("Week");
  return /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
    /* @__PURE__ */ e.jsx("div", { className: "reports-periods group-data-[state=collapsed]:hidden", children: ["Day", "Week", "Month"].map((i) => /* @__PURE__ */ e.jsx(
      "button",
      {
        type: "button",
        onClick: () => a(i),
        className: i === s ? "reports-period-active" : void 0,
        children: i
      },
      i
    )) }),
    /* @__PURE__ */ e.jsx(t, {})
  ] });
}
function w({ Default: t, ...s }) {
  return /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
    /* @__PURE__ */ e.jsx("div", { className: "reports-banner", children: "Demo data · refreshed nightly" }),
    /* @__PURE__ */ e.jsx(t, { ...s })
  ] });
}
function A({ Default: t, ...s }) {
  return /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
    /* @__PURE__ */ e.jsx(t, { ...s }),
    /* @__PURE__ */ e.jsx("span", { className: "reports-tag", children: "Read-only" })
  ] });
}
export {
  w as Header,
  A as HeaderStart,
  k as Sidebar,
  S as SidebarContent,
  f as SidebarHeader
};
