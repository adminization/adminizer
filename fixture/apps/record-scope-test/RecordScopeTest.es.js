var p = { exports: {} }, d = {};
var N;
function T() {
  if (N) return d;
  N = 1;
  var n = /* @__PURE__ */ Symbol.for("react.transitional.element"), r = /* @__PURE__ */ Symbol.for("react.fragment");
  function s(x, t, l) {
    var j = null;
    if (l !== void 0 && (j = "" + l), t.key !== void 0 && (j = "" + t.key), "key" in t) {
      l = {};
      for (var u in t)
        u !== "key" && (l[u] = t[u]);
    } else l = t;
    return t = l.ref, {
      $$typeof: n,
      type: x,
      key: j,
      ref: t !== void 0 ? t : null,
      props: l
    };
  }
  return d.Fragment = r, d.jsx = s, d.jsxs = s, d;
}
var f;
function g() {
  return f || (f = 1, p.exports = T()), p.exports;
}
var e = g();
const w = window.UIComponents.Badge, i = window.UIComponents.Card, c = window.UIComponents.CardContent, o = window.UIComponents.CardHeader, a = window.UIComponents.CardTitle, v = window.UIComponents.Table, R = window.UIComponents.TableBody, m = window.UIComponents.TableCell, h = window.UIComponents.TableHead, b = window.UIComponents.TableHeader, C = window.UIComponents.TableRow;
function I({ allowed: n }) {
  return n ? /* @__PURE__ */ e.jsx("span", { className: "font-bold text-green-600", children: "✓" }) : /* @__PURE__ */ e.jsx("span", { className: "text-muted-foreground", children: "·" });
}
function U({ data: n }) {
  const { current: r } = n;
  return /* @__PURE__ */ e.jsxs("div", { className: "flex flex-col gap-4", children: [
    /* @__PURE__ */ e.jsxs(i, { children: [
      /* @__PURE__ */ e.jsx(o, { children: /* @__PURE__ */ e.jsxs(a, { className: "flex items-center gap-2", children: [
        "Токен на отдельные записи",
        /* @__PURE__ */ e.jsx(w, { variant: n.seeded ? "default" : "destructive", children: n.seeded ? "демо-данные на месте" : "нет демо-данных" })
      ] }) }),
      /* @__PURE__ */ e.jsxs(c, { className: "space-y-2 text-sm", children: [
        /* @__PURE__ */ e.jsxs("p", { children: [
          "Токен ",
          /* @__PURE__ */ e.jsx("code", { children: n.token }),
          " выдаётся не на модель целиком, а на конкретные записи Test: группа хранит список их id, а ",
          /* @__PURE__ */ e.jsx("code", { children: "check" }),
          " токена пускает только к ним. Всего записей Test — ",
          n.totalRecords,
          ", демо занимает первые ",
          n.records.length,
          "."
        ] }),
        !n.seeded && /* @__PURE__ */ e.jsxs("p", { className: "text-destructive", children: [
          "Демо-группы пусты — в таблице Test нет записей. Запустите фикстуру с сидом: ",
          /* @__PURE__ */ e.jsx("code", { children: "npm run start:seed" }),
          "."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(i, { children: [
      /* @__PURE__ */ e.jsx(o, { children: /* @__PURE__ */ e.jsx(a, { children: "Матрица доступа" }) }),
      /* @__PURE__ */ e.jsxs(c, { className: "space-y-3", children: [
        /* @__PURE__ */ e.jsxs(v, { children: [
          /* @__PURE__ */ e.jsx(b, { children: /* @__PURE__ */ e.jsxs(C, { children: [
            /* @__PURE__ */ e.jsx(h, { children: "Пользователь" }),
            /* @__PURE__ */ e.jsx(h, { children: "Группы" }),
            n.records.map((s) => /* @__PURE__ */ e.jsxs(h, { className: "text-center", children: [
              "#",
              s.index
            ] }, s.id)),
            /* @__PURE__ */ e.jsx(h, { className: "text-right", children: "Всего записей" })
          ] }) }),
          /* @__PURE__ */ e.jsx(R, { children: n.users.map((s) => /* @__PURE__ */ e.jsxs(C, { children: [
            /* @__PURE__ */ e.jsxs(m, { className: "font-medium", children: [
              s.login,
              s.isAdministrator && /* @__PURE__ */ e.jsx(w, { className: "ml-2", variant: "secondary", children: "админ" })
            ] }),
            /* @__PURE__ */ e.jsx(m, { className: "text-muted-foreground", children: s.groups.join(", ") || "—" }),
            n.records.map((x) => /* @__PURE__ */ e.jsx(m, { className: "text-center", children: /* @__PURE__ */ e.jsx(I, { allowed: s.allowed.includes(x.id) }) }, x.id)),
            /* @__PURE__ */ e.jsx(m, { className: "text-right", children: s.grantedTotal })
          ] }, s.login)) })
        ] }),
        /* @__PURE__ */ e.jsxs("p", { className: "text-sm text-muted-foreground", children: [
          "Каждая клетка — это ответ ",
          /* @__PURE__ */ e.jsxs("code", { children: [
            "accessRights.hasPermission(token, user, ",
            "{testId}",
            ")"
          ] }),
          ". Группы дают пересекающиеся наборы, поэтому user2 состоит в обеих и видит их объединение, а pass не состоит ни в одной и не видит ничего."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ e.jsxs(i, { children: [
        /* @__PURE__ */ e.jsx(o, { children: /* @__PURE__ */ e.jsx(a, { children: "Демо-записи Test" }) }),
        /* @__PURE__ */ e.jsx(c, { children: /* @__PURE__ */ e.jsx("ol", { className: "space-y-1 text-sm", children: n.records.map((s) => /* @__PURE__ */ e.jsxs("li", { children: [
          /* @__PURE__ */ e.jsxs("span", { className: "text-muted-foreground", children: [
            "#",
            s.index
          ] }),
          " ",
          s.title
        ] }, s.id)) }) })
      ] }),
      /* @__PURE__ */ e.jsxs(i, { children: [
        /* @__PURE__ */ e.jsx(o, { children: /* @__PURE__ */ e.jsx(a, { children: "Кто что выдаёт" }) }),
        /* @__PURE__ */ e.jsx(c, { className: "space-y-3 text-sm", children: n.groups.map((s) => /* @__PURE__ */ e.jsxs("div", { children: [
          /* @__PURE__ */ e.jsx("p", { className: "font-medium", children: s.name }),
          /* @__PURE__ */ e.jsx("p", { className: "text-muted-foreground", children: s.description }),
          /* @__PURE__ */ e.jsx("p", { className: "text-muted-foreground", children: s.exists ? `записей в гранте: ${s.rights.length}` : "группа не создана" })
        ] }, s.name)) })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs(i, { children: [
      /* @__PURE__ */ e.jsx(o, { children: /* @__PURE__ */ e.jsx(a, { children: "Ваш доступ" }) }),
      /* @__PURE__ */ e.jsxs(c, { className: "space-y-2 text-sm", children: [
        /* @__PURE__ */ e.jsxs("p", { children: [
          /* @__PURE__ */ e.jsx("span", { className: "font-medium", children: r.login }),
          r.groups.length > 0 && /* @__PURE__ */ e.jsxs("span", { className: "text-muted-foreground", children: [
            " · ",
            r.groups.join(", ")
          ] })
        ] }),
        /* @__PURE__ */ e.jsxs("p", { className: "text-xl font-bold", children: [
          r.visibleCount,
          " из ",
          n.totalRecords
        ] }),
        r.isAdministrator ? /* @__PURE__ */ e.jsx("p", { className: "text-muted-foreground", children: "Администратор проходит любую проверку прав, поэтому здесь видны все записи. Чтобы увидеть работу токена, войдите под user1, user2, user3 или pass." }) : r.visible.length ? /* @__PURE__ */ e.jsx("ul", { className: "list-disc space-y-1 pl-5", children: r.visible.map((s) => /* @__PURE__ */ e.jsx("li", { children: s.title }, s.id)) }) : /* @__PURE__ */ e.jsxs("p", { className: "text-muted-foreground", children: [
          "Ни одна запись не открыта: ваши группы не выдают токен ",
          /* @__PURE__ */ e.jsx("code", { children: n.token }),
          "."
        ] })
      ] })
    ] })
  ] });
}
export {
  U as default
};
