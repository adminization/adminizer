var p = { exports: {} }, a = {};
var h;
function R() {
  if (h) return a;
  h = 1;
  var c = /* @__PURE__ */ Symbol.for("react.transitional.element"), u = /* @__PURE__ */ Symbol.for("react.fragment");
  function o(x, t, e) {
    var r = null;
    if (e !== void 0 && (r = "" + e), t.key !== void 0 && (r = "" + t.key), "key" in t) {
      e = {};
      for (var s in t)
        s !== "key" && (e[s] = t[s]);
    } else e = t;
    return t = e.ref, {
      $$typeof: c,
      type: x,
      key: r,
      ref: t !== void 0 ? t : null,
      props: e
    };
  }
  return a.Fragment = u, a.jsx = o, a.jsxs = o, a;
}
var j;
function v() {
  return j || (j = 1, p.exports = R()), p.exports;
}
var n = v();
const f = window.React.useState, U = window.UIComponents.Button, I = window.UIComponents.Table, $ = window.UIComponents.TableBody, l = window.UIComponents.TableCell, i = window.UIComponents.TableHead, g = window.UIComponents.TableHeader, T = window.UIComponents.TableRow, y = window.UIComponents.Card, E = window.UIComponents.CardContent, k = window.UIComponents.CardHeader, M = window.UIComponents.CardTitle, d = window.sonner.toast, b = window.axios, _ = window.UIComponents.Toaster, m = window.InertiajsReact.router, H = window.JSComponents.DeleteModal;
function J({ data: c }) {
  const [u, o] = f(c.modules), x = async (e, r) => {
    const s = r === "enabled" ? "disable" : "enable";
    try {
      await b.post(`${window.routePrefix}/module-manager/${s}`, { name: e }), d.success(`Модуль ${e} успешно ${s === "enable" ? "включён" : "выключен"}.`), o(
        (C) => C.map(
          (w) => w.name === e ? { ...w, state: s === "enable" ? "enabled" : "disabled" } : w
        )
      ), m.reload();
    } catch {
      d.error(`Ошибка при ${s === "enable" ? "включении" : "выключении"} модуля ${e}.`);
    }
  }, t = async (e) => {
    console.log("handleUnregister called for:", e);
    try {
      await b.post(`${window.routePrefix}/module-manager/unregister`, { name: e }), d.success(`Модуль ${e} успешно удалён.`), o((r) => r.filter((s) => s.name !== e)), m.reload();
    } catch {
      d.error(`Ошибка при удалении модуля ${e}.`);
    }
  };
  return /* @__PURE__ */ n.jsxs(n.Fragment, { children: [
    /* @__PURE__ */ n.jsx(_, { position: "top-center", richColors: !0, closeButton: !0 }),
    /* @__PURE__ */ n.jsxs(y, { className: "py-4", children: [
      /* @__PURE__ */ n.jsx(k, { children: /* @__PURE__ */ n.jsx(M, { children: "Менеджер модулей" }) }),
      /* @__PURE__ */ n.jsx(E, { children: /* @__PURE__ */ n.jsxs(I, { children: [
        /* @__PURE__ */ n.jsx(g, { children: /* @__PURE__ */ n.jsxs(T, { children: [
          /* @__PURE__ */ n.jsx(i, { children: "Имя" }),
          /* @__PURE__ */ n.jsx(i, { children: "Версия" }),
          /* @__PURE__ */ n.jsx(i, { children: "Статус" }),
          /* @__PURE__ */ n.jsx(i, { children: "Действия" })
        ] }) }),
        /* @__PURE__ */ n.jsx($, { children: u.map((e) => /* @__PURE__ */ n.jsxs(T, { children: [
          /* @__PURE__ */ n.jsx(l, { children: e.name }),
          /* @__PURE__ */ n.jsx(l, { children: e.version }),
          /* @__PURE__ */ n.jsx(l, { children: /* @__PURE__ */ n.jsx(
            "span",
            {
              className: `px-2 py-1 rounded text-xs font-medium ${e.state === "enabled" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`,
              children: e.state
            }
          ) }),
          /* @__PURE__ */ n.jsxs(l, { className: "flex gap-x-4", children: [
            /* @__PURE__ */ n.jsx(
              U,
              {
                onClick: () => x(e.name, e.state),
                variant: e.state === "enabled" ? "destructive" : "default",
                size: "sm",
                children: e.state === "enabled" ? "Выключить" : "Включить"
              }
            ),
            /* @__PURE__ */ n.jsx(
              H,
              {
                btnTitle: "Удалить",
                variant: "destructive",
                btnCLass: "",
                handleDelete: () => t(e.name),
                isLink: !1,
                delModal: {
                  yes: "Да",
                  no: "Нет",
                  text: `Вы уверены, что хотите удалить модуль ${e.name}? Это действие нельзя отменить.`
                }
              }
            )
          ] })
        ] }, e.name)) })
      ] }) })
    ] })
  ] });
}
export {
  J as default
};
