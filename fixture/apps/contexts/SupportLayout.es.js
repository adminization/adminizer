var u = { exports: {} }, t = {};
var l;
function p() {
  if (l) return t;
  l = 1;
  var c = /* @__PURE__ */ Symbol.for("react.transitional.element"), o = /* @__PURE__ */ Symbol.for("react.fragment");
  function i(s, e, r) {
    var d = null;
    if (r !== void 0 && (d = "" + r), e.key !== void 0 && (d = "" + e.key), "key" in e) {
      r = {};
      for (var a in e)
        a !== "key" && (r[a] = e[a]);
    } else r = e;
    return e = r.ref, {
      $$typeof: c,
      type: s,
      key: d,
      ref: e !== void 0 ? e : null,
      props: r
    };
  }
  return t.Fragment = o, t.jsx = i, t.jsxs = i, t;
}
var x;
function w() {
  return x || (x = 1, u.exports = p()), u.exports;
}
var n = w();
const S = window.InertiajsReact.Link, h = window.InertiajsReact.usePage, b = window.UIComponents.Sidebar, j = window.UIComponents.SidebarContent, m = window.UIComponents.SidebarGroup, C = window.UIComponents.SidebarGroupLabel, R = window.UIComponents.SidebarHeader, v = window.UIComponents.SidebarMenu, I = window.UIComponents.SidebarMenuBadge, M = window.UIComponents.SidebarMenuButton, k = window.UIComponents.SidebarMenuItem, A = window.AdminizerShell.ContextSwitcher, U = window.AdminizerShell.MaterialIcon, E = window.AdminizerShell.useAdminContext;
function f(c) {
  const o = h(), { menu: i, isActive: s } = E();
  return /* @__PURE__ */ n.jsxs(b, { collapsible: "icon", variant: "inset", children: [
    /* @__PURE__ */ n.jsx(R, { children: /* @__PURE__ */ n.jsx(A, { side: "right" }) }),
    /* @__PURE__ */ n.jsxs(j, { children: [
      /* @__PURE__ */ n.jsxs(m, { children: [
        /* @__PURE__ */ n.jsx(C, { children: "Queues" }),
        /* @__PURE__ */ n.jsx(v, { children: i.map((e) => /* @__PURE__ */ n.jsxs(k, { children: [
          /* @__PURE__ */ n.jsx(M, { asChild: !0, isActive: s(e.link), tooltip: e.title, children: /* @__PURE__ */ n.jsxs(S, { href: e.link, children: [
            e.icon && /* @__PURE__ */ n.jsx(U, { name: e.icon, className: "!text-[18px]" }),
            /* @__PURE__ */ n.jsx("span", { children: e.title })
          ] }) }),
          e.badge ? /* @__PURE__ */ n.jsx(I, { children: e.badge }) : null
        ] }, e.id)) })
      ] }),
      /* @__PURE__ */ n.jsxs(
        "div",
        {
          style: { margin: "auto 12px 12px", padding: 12, borderRadius: 8, fontSize: 12, background: "var(--sidebar-accent)" },
          className: "group-data-[state=collapsed]:hidden",
          children: [
            "On duty: ",
            o.props.auth?.user?.login
          ]
        }
      )
    ] })
  ] });
}
export {
  f as Sidebar
};
