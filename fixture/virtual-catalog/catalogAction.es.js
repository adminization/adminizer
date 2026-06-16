var c = { exports: {} }, i = {};
var m;
function R() {
  if (m) return i;
  m = 1;
  var u = /* @__PURE__ */ Symbol.for("react.transitional.element"), l = /* @__PURE__ */ Symbol.for("react.fragment");
  function a(d, e, t) {
    var s = null;
    if (t !== void 0 && (s = "" + t), e.key !== void 0 && (s = "" + e.key), "key" in e) {
      t = {};
      for (var n in e)
        n !== "key" && (t[n] = e[n]);
    } else t = e;
    return e = t.ref, {
      $$typeof: u,
      type: d,
      key: s,
      ref: e !== void 0 ? e : null,
      props: t
    };
  }
  return i.Fragment = l, i.jsx = a, i.jsxs = a, i;
}
var p;
function f() {
  return p || (p = 1, c.exports = R()), c.exports;
}
var r = f();
const h = window.UIComponents.Label, w = window.UIComponents.Input, x = window.React.useState, j = window.axios, E = window.UIComponents.Button, k = ({ items: u, callback: l }) => {
  const [a, d] = x(""), [e, t] = x(!1), [s, n] = x(""), v = async () => {
    t(!0), n("Отправка данных...");
    try {
      const o = {
        actionID: "external_action",
        items: u,
        data: { number: a }
      };
      (await j.put("", { data: o, _method: "handleAction" })).data.data === "ok" ? (n("Данные успешно отправлены."), setTimeout(() => {
        l();
      }, 500)) : n("Неверный ответ.");
    } catch (o) {
      console.log(o);
    } finally {
      t(!1);
    }
  };
  return /* @__PURE__ */ r.jsx("div", { className: "mt-4 px-8", children: /* @__PURE__ */ r.jsxs("div", { className: "flex flex-col gap-3", children: [
    /* @__PURE__ */ r.jsx(h, { htmlFor: "name", children: "5 + 2 = ?" }),
    /* @__PURE__ */ r.jsx(
      w,
      {
        required: !0,
        value: a,
        type: "number",
        name: "number",
        placeholder: "number",
        onChange: (o) => d(o.target.value),
        disabled: e
      }
    ),
    /* @__PURE__ */ r.jsx(E, { variant: "default", className: "w-fit", onClick: v, disabled: e, children: "Отправить" }),
    s && /* @__PURE__ */ r.jsx("div", { children: s })
  ] }) });
};
export {
  k as default
};
