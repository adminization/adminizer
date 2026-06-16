var m = { exports: {} }, d = {};
var f;
function I() {
  if (f) return d;
  f = 1;
  var n = /* @__PURE__ */ Symbol.for("react.transitional.element"), e = /* @__PURE__ */ Symbol.for("react.fragment");
  function s(u, a, t) {
    var o = null;
    if (t !== void 0 && (o = "" + t), a.key !== void 0 && (o = "" + a.key), "key" in a) {
      t = {};
      for (var i in a)
        i !== "key" && (t[i] = a[i]);
    } else t = a;
    return a = t.ref, {
      $$typeof: n,
      type: u,
      key: o,
      ref: a !== void 0 ? a : null,
      props: t
    };
  }
  return d.Fragment = e, d.jsx = s, d.jsxs = s, d;
}
var w;
function E() {
  return w || (w = 1, m.exports = I()), m.exports;
}
var r = E();
const C = window.UIComponents.Label, T = window.UIComponents.Input, _ = window.UIComponents.Button, h = window.React.useState, g = window.React.useEffect, v = window.axios, k = window.LucideReact.LoaderCircle;
function L(n) {
  return "mode" in n && "template" in n && "actions" in n;
}
const S = (n) => {
  const e = L(n) ? n : null, s = e ? null : n, u = e ? e.mode === "update" : s?.update ?? !1, a = e ? e.parentId : s?.parentId, t = e ? e.template.data.item : s?.item, [o, i] = h(""), [p, x] = h(!1);
  g(() => {
    t && i(t.title ?? t.name ?? "");
  }, [t]);
  const R = (c) => {
    i(c.target.value);
  }, j = async (c) => {
    c.preventDefault(), x(!0);
    try {
      let l = null;
      u ? (l = await v.put("", {
        type: "group",
        modelId: t?.id,
        data: {
          ...t,
          name: o,
          title: o
        },
        _method: "updateItem"
      }), e ? (e.actions.close(), await e.actions.reload(l.data.data)) : s?.callback?.(l.data.data)) : (await v.post("", {
        data: {
          title: o,
          parentId: a,
          type: "group"
        },
        _method: "createItem"
      }), e ? (e.actions.close(), await e.actions.reload(null)) : s?.callback?.(null));
    } catch (l) {
      console.error(l);
    } finally {
      x(!1);
    }
  };
  return /* @__PURE__ */ r.jsxs("div", { className: "p-8", children: [
    /* @__PURE__ */ r.jsx("form", { className: "grid gap-6", id: "group-add", onSubmit: j, children: /* @__PURE__ */ r.jsxs("div", { className: "grid gap-4", children: [
      /* @__PURE__ */ r.jsx(C, { htmlFor: "name", children: "Name" }),
      /* @__PURE__ */ r.jsx(
        T,
        {
          required: !0,
          value: o,
          name: "title",
          placeholder: "Title",
          onChange: R
        }
      )
    ] }) }),
    /* @__PURE__ */ r.jsxs(_, { className: "mt-8 w-fit", form: "group-add", type: "submit", disabled: p, children: [
      "Save",
      p && /* @__PURE__ */ r.jsx(k, { className: "h-4 w-4 animate-spin ml-2" })
    ] })
  ] });
};
export {
  S as default
};
