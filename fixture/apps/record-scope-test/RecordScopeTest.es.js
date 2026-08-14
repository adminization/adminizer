var v = { exports: {} }, E = {};
var $;
function ae() {
  if ($) return E;
  $ = 1;
  var s = /* @__PURE__ */ Symbol.for("react.transitional.element"), u = /* @__PURE__ */ Symbol.for("react.fragment");
  function f(d, l, c) {
    var m = null;
    if (c !== void 0 && (m = "" + c), l.key !== void 0 && (m = "" + l.key), "key" in l) {
      c = {};
      for (var _ in l)
        _ !== "key" && (c[_] = l[_]);
    } else c = l;
    return l = c.ref, {
      $$typeof: s,
      type: d,
      key: m,
      ref: l !== void 0 ? l : null,
      props: c
    };
  }
  return E.Fragment = u, E.jsx = f, E.jsxs = f, E;
}
var p = {};
var F;
function oe() {
  return F || (F = 1, process.env.NODE_ENV !== "production" && (function() {
    function s(e) {
      if (e == null) return null;
      if (typeof e == "function")
        return e.$$typeof === re ? null : e.displayName || e.name || null;
      if (typeof e == "string") return e;
      switch (e) {
        case T:
          return "Fragment";
        case G:
          return "Profiler";
        case z:
          return "StrictMode";
        case Z:
          return "Suspense";
        case Q:
          return "SuspenseList";
        case ee:
          return "Activity";
      }
      if (typeof e == "object")
        switch (typeof e.tag == "number" && console.error(
          "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
        ), e.$$typeof) {
          case q:
            return "Portal";
          case H:
            return e.displayName || "Context";
          case X:
            return (e._context.displayName || "Context") + ".Consumer";
          case B:
            var r = e.render;
            return e = e.displayName, e || (e = r.displayName || r.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
          case K:
            return r = e.displayName || null, r !== null ? r : s(e.type) || "Memo";
          case x:
            r = e._payload, e = e._init;
            try {
              return s(e(r));
            } catch {
            }
        }
      return null;
    }
    function u(e) {
      return "" + e;
    }
    function f(e) {
      try {
        u(e);
        var r = !1;
      } catch {
        r = !0;
      }
      if (r) {
        r = console;
        var t = r.error, n = typeof Symbol == "function" && Symbol.toStringTag && e[Symbol.toStringTag] || e.constructor.name || "Object";
        return t.call(
          r,
          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
          n
        ), u(e);
      }
    }
    function d(e) {
      if (e === T) return "<>";
      if (typeof e == "object" && e !== null && e.$$typeof === x)
        return "<...>";
      try {
        var r = s(e);
        return r ? "<" + r + ">" : "<...>";
      } catch {
        return "<...>";
      }
    }
    function l() {
      var e = j.A;
      return e === null ? null : e.getOwner();
    }
    function c() {
      return Error("react-stack-top-frame");
    }
    function m(e) {
      if (y.call(e, "key")) {
        var r = Object.getOwnPropertyDescriptor(e, "key").get;
        if (r && r.isReactWarning) return !1;
      }
      return e.key !== void 0;
    }
    function _(e, r) {
      function t() {
        C || (C = !0, console.error(
          "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
          r
        ));
      }
      t.isReactWarning = !0, Object.defineProperty(e, "key", {
        get: t,
        configurable: !0
      });
    }
    function J() {
      var e = s(this.type);
      return g[e] || (g[e] = !0, console.error(
        "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
      )), e = this.props.ref, e !== void 0 ? e : null;
    }
    function V(e, r, t, n, b, k) {
      var a = t.ref;
      return e = {
        $$typeof: P,
        type: e,
        key: r,
        props: t,
        _owner: n
      }, (a !== void 0 ? a : null) !== null ? Object.defineProperty(e, "ref", {
        enumerable: !1,
        get: J
      }) : Object.defineProperty(e, "ref", { enumerable: !1, value: null }), e._store = {}, Object.defineProperty(e._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: 0
      }), Object.defineProperty(e, "_debugInfo", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: null
      }), Object.defineProperty(e, "_debugStack", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: b
      }), Object.defineProperty(e, "_debugTask", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: k
      }), Object.freeze && (Object.freeze(e.props), Object.freeze(e)), e;
    }
    function O(e, r, t, n, b, k) {
      var a = r.children;
      if (a !== void 0)
        if (n)
          if (te(a)) {
            for (n = 0; n < a.length; n++)
              A(a[n]);
            Object.freeze && Object.freeze(a);
          } else
            console.error(
              "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
            );
        else A(a);
      if (y.call(r, "key")) {
        a = s(e);
        var i = Object.keys(r).filter(function(ne) {
          return ne !== "key";
        });
        n = 0 < i.length ? "{key: someKey, " + i.join(": ..., ") + ": ...}" : "{key: someKey}", I[a + n] || (i = 0 < i.length ? "{" + i.join(": ..., ") + ": ...}" : "{}", console.error(
          `A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`,
          n,
          a,
          i,
          a
        ), I[a + n] = !0);
      }
      if (a = null, t !== void 0 && (f(t), a = "" + t), m(r) && (f(r.key), a = "" + r.key), "key" in r) {
        t = {};
        for (var w in r)
          w !== "key" && (t[w] = r[w]);
      } else t = r;
      return a && _(
        t,
        typeof e == "function" ? e.displayName || e.name || "Unknown" : e
      ), V(
        e,
        a,
        t,
        l(),
        b,
        k
      );
    }
    function A(e) {
      S(e) ? e._store && (e._store.validated = 1) : typeof e == "object" && e !== null && e.$$typeof === x && (e._payload.status === "fulfilled" ? S(e._payload.value) && e._payload.value._store && (e._payload.value._store.validated = 1) : e._store && (e._store.validated = 1));
    }
    function S(e) {
      return typeof e == "object" && e !== null && e.$$typeof === P;
    }
    var R = window.React, P = /* @__PURE__ */ Symbol.for("react.transitional.element"), q = /* @__PURE__ */ Symbol.for("react.portal"), T = /* @__PURE__ */ Symbol.for("react.fragment"), z = /* @__PURE__ */ Symbol.for("react.strict_mode"), G = /* @__PURE__ */ Symbol.for("react.profiler"), X = /* @__PURE__ */ Symbol.for("react.consumer"), H = /* @__PURE__ */ Symbol.for("react.context"), B = /* @__PURE__ */ Symbol.for("react.forward_ref"), Z = /* @__PURE__ */ Symbol.for("react.suspense"), Q = /* @__PURE__ */ Symbol.for("react.suspense_list"), K = /* @__PURE__ */ Symbol.for("react.memo"), x = /* @__PURE__ */ Symbol.for("react.lazy"), ee = /* @__PURE__ */ Symbol.for("react.activity"), re = /* @__PURE__ */ Symbol.for("react.client.reference"), j = R.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, y = Object.prototype.hasOwnProperty, te = Array.isArray, h = console.createTask ? console.createTask : function() {
      return null;
    };
    R = {
      react_stack_bottom_frame: function(e) {
        return e();
      }
    };
    var C, g = {}, N = R.react_stack_bottom_frame.bind(
      R,
      c
    )(), Y = h(d(c)), I = {};
    p.Fragment = T, p.jsx = function(e, r, t) {
      var n = 1e4 > j.recentlyCreatedOwnerStacks++;
      return O(
        e,
        r,
        t,
        !1,
        n ? Error("react-stack-top-frame") : N,
        n ? h(d(e)) : Y
      );
    }, p.jsxs = function(e, r, t) {
      var n = 1e4 > j.recentlyCreatedOwnerStacks++;
      return O(
        e,
        r,
        t,
        !0,
        n ? Error("react-stack-top-frame") : N,
        n ? h(d(e)) : Y
      );
    };
  })()), p;
}
var U;
function se() {
  return U || (U = 1, process.env.NODE_ENV === "production" ? v.exports = ae() : v.exports = oe()), v.exports;
}
var o = se();
const D = window.UIComponents.Card, L = window.UIComponents.CardContent, M = window.UIComponents.CardHeader, W = window.UIComponents.CardTitle;
function le({ data: s }) {
  return /* @__PURE__ */ o.jsxs("div", { className: "flex flex-col gap-4", children: [
    /* @__PURE__ */ o.jsxs(D, { children: [
      /* @__PURE__ */ o.jsx(M, { children: /* @__PURE__ */ o.jsx(W, { children: "Проверка доступа к записям Test" }) }),
      /* @__PURE__ */ o.jsx(L, { children: /* @__PURE__ */ o.jsx("p", { className: "text-xl font-bold", children: s.available ? "Доступно" : "Недоступно" }) })
    ] }),
    /* @__PURE__ */ o.jsxs(D, { children: [
      /* @__PURE__ */ o.jsx(M, { children: /* @__PURE__ */ o.jsx(W, { children: "Доступные записи Test" }) }),
      /* @__PURE__ */ o.jsx(L, { children: s.availableTests.length ? /* @__PURE__ */ o.jsx("ul", { className: "list-disc space-y-1 pl-5", children: s.availableTests.map((u) => /* @__PURE__ */ o.jsx("li", { children: u.title }, u.id)) }) : /* @__PURE__ */ o.jsx("p", { className: "text-muted-foreground", children: "Нет доступных записей" }) })
    ] })
  ] });
}
export {
  le as default
};
