var ef = { exports: {} }, Ei = {};
var Qm;
function Xv() {
  if (Qm) return Ei;
  Qm = 1;
  var l = /* @__PURE__ */ Symbol.for("react.transitional.element"), i = /* @__PURE__ */ Symbol.for("react.fragment");
  function s(c, o, p) {
    var d = null;
    if (p !== void 0 && (d = "" + p), o.key !== void 0 && (d = "" + o.key), "key" in o) {
      p = {};
      for (var m in o)
        m !== "key" && (p[m] = o[m]);
    } else p = o;
    return o = p.ref, {
      $$typeof: l,
      type: c,
      key: d,
      ref: o !== void 0 ? o : null,
      props: p
    };
  }
  return Ei.Fragment = i, Ei.jsx = s, Ei.jsxs = s, Ei;
}
var Gm;
function Yv() {
  return Gm || (Gm = 1, ef.exports = Xv()), ef.exports;
}
var Ge = Yv();
function Qv(l) {
  return typeof l == "symbol" || l instanceof Symbol;
}
const Zm = typeof globalThis == "object" && globalThis || typeof window == "object" && window || typeof self == "object" && self || typeof global == "object" && global || /* @__PURE__ */ (function() {
  return this;
})() || Function("return this")();
function Gv() {
}
function Zv(l) {
  return l == null || typeof l != "object" && typeof l != "function";
}
function Vv(l) {
  return ArrayBuffer.isView(l) && !(l instanceof DataView);
}
function yf(l) {
  return Object.getOwnPropertySymbols(l).filter((i) => Object.prototype.propertyIsEnumerable.call(l, i));
}
function Ss(l) {
  return l == null ? l === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(l);
}
const Tp = "[object RegExp]", Up = "[object String]", Np = "[object Number]", xp = "[object Boolean]", gf = "[object Arguments]", qp = "[object Symbol]", jp = "[object Date]", Hp = "[object Map]", Bp = "[object Set]", _p = "[object Array]", Kv = "[object Function]", Cp = "[object ArrayBuffer]", os = "[object Object]", Pv = "[object Error]", Lp = "[object DataView]", Xp = "[object Uint8Array]", Yp = "[object Uint8ClampedArray]", Qp = "[object Uint16Array]", Gp = "[object Uint32Array]", Jv = "[object BigUint64Array]", Zp = "[object Int8Array]", Vp = "[object Int16Array]", Kp = "[object Int32Array]", Fv = "[object BigInt64Array]", Pp = "[object Float32Array]", Jp = "[object Float64Array]";
function vf(l) {
  return typeof Zm.Buffer < "u" && Zm.Buffer.isBuffer(l);
}
function Oa(l, i, s, c = /* @__PURE__ */ new Map(), o = void 0) {
  const p = o?.(l, i, s, c);
  if (p !== void 0)
    return p;
  if (Zv(l))
    return l;
  if (c.has(l))
    return c.get(l);
  if (Array.isArray(l)) {
    const d = new Array(l.length);
    c.set(l, d);
    for (let m = 0; m < l.length; m++)
      d[m] = Oa(l[m], m, s, c, o);
    return Object.hasOwn(l, "index") && (d.index = l.index), Object.hasOwn(l, "input") && (d.input = l.input), d;
  }
  if (l instanceof Date)
    return new Date(l.getTime());
  if (l instanceof RegExp) {
    const d = new RegExp(l.source, l.flags);
    return d.lastIndex = l.lastIndex, d;
  }
  if (l instanceof Map) {
    const d = /* @__PURE__ */ new Map();
    c.set(l, d);
    for (const [m, g] of l)
      d.set(m, Oa(g, m, s, c, o));
    return d;
  }
  if (l instanceof Set) {
    const d = /* @__PURE__ */ new Set();
    c.set(l, d);
    for (const m of l)
      d.add(Oa(m, void 0, s, c, o));
    return d;
  }
  if (vf(l))
    return l.subarray();
  if (Vv(l)) {
    const d = new (Object.getPrototypeOf(l)).constructor(l.length);
    c.set(l, d);
    for (let m = 0; m < l.length; m++)
      d[m] = Oa(l[m], m, s, c, o);
    return d;
  }
  if (l instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && l instanceof SharedArrayBuffer)
    return l.slice(0);
  if (l instanceof DataView) {
    const d = new DataView(l.buffer.slice(0), l.byteOffset, l.byteLength);
    return c.set(l, d), cl(d, l, s, c, o), d;
  }
  if (typeof File < "u" && l instanceof File) {
    const d = new File([l], l.name, {
      type: l.type
    });
    return c.set(l, d), cl(d, l, s, c, o), d;
  }
  if (typeof Blob < "u" && l instanceof Blob) {
    const d = new Blob([l], { type: l.type });
    return c.set(l, d), cl(d, l, s, c, o), d;
  }
  if (l instanceof Error) {
    const d = structuredClone(l);
    return c.set(l, d), d.message = l.message, d.name = l.name, d.stack = l.stack, d.cause = l.cause, d.constructor = l.constructor, cl(d, l, s, c, o), d;
  }
  if (l instanceof Boolean) {
    const d = new Boolean(l.valueOf());
    return c.set(l, d), cl(d, l, s, c, o), d;
  }
  if (l instanceof Number) {
    const d = new Number(l.valueOf());
    return c.set(l, d), cl(d, l, s, c, o), d;
  }
  if (l instanceof String) {
    const d = new String(l.valueOf());
    return c.set(l, d), cl(d, l, s, c, o), d;
  }
  if (typeof l == "object" && $v(l)) {
    const d = Object.create(Object.getPrototypeOf(l));
    return c.set(l, d), cl(d, l, s, c, o), d;
  }
  return l;
}
function cl(l, i, s = l, c, o) {
  const p = [...Object.keys(i), ...yf(i)];
  for (let d = 0; d < p.length; d++) {
    const m = p[d], g = Object.getOwnPropertyDescriptor(l, m);
    (g == null || g.writable) && (l[m] = Oa(i[m], m, s, c, o));
  }
}
function $v(l) {
  switch (Ss(l)) {
    case gf:
    case _p:
    case Cp:
    case Lp:
    case xp:
    case jp:
    case Pp:
    case Jp:
    case Zp:
    case Vp:
    case Kp:
    case Hp:
    case Np:
    case os:
    case Tp:
    case Bp:
    case Up:
    case qp:
    case Xp:
    case Yp:
    case Qp:
    case Gp:
      return !0;
    default:
      return !1;
  }
}
function sn(l) {
  return Oa(l, void 0, l, /* @__PURE__ */ new Map(), void 0);
}
function Vm(l) {
  if (!l || typeof l != "object")
    return !1;
  const i = Object.getPrototypeOf(l);
  return i === null || i === Object.prototype || Object.getPrototypeOf(i) === null ? Object.prototype.toString.call(l) === "[object Object]" : !1;
}
function bs(l) {
  return l === "__proto__";
}
function Fp(l, i) {
  return l === i || Number.isNaN(l) && Number.isNaN(i);
}
function Wv(l, i, s) {
  return Ui(l, i, void 0, void 0, void 0, void 0, s);
}
function Ui(l, i, s, c, o, p, d) {
  const m = d(l, i, s, c, o, p);
  if (m !== void 0)
    return m;
  if (typeof l == typeof i)
    switch (typeof l) {
      case "bigint":
      case "string":
      case "boolean":
      case "symbol":
      case "undefined":
        return l === i;
      case "number":
        return l === i || Object.is(l, i);
      case "function":
        return l === i;
      case "object":
        return ji(l, i, p, d);
    }
  return ji(l, i, p, d);
}
function ji(l, i, s, c) {
  if (Object.is(l, i))
    return !0;
  let o = Ss(l), p = Ss(i);
  if (o === gf && (o = os), p === gf && (p = os), o !== p)
    return !1;
  switch (o) {
    case Up:
      return l.toString() === i.toString();
    case Np: {
      const g = l.valueOf(), S = i.valueOf();
      return Fp(g, S);
    }
    case xp:
    case jp:
    case qp:
      return Object.is(l.valueOf(), i.valueOf());
    case Tp:
      return l.source === i.source && l.flags === i.flags;
    case Kv:
      return l === i;
  }
  s = s ?? /* @__PURE__ */ new Map();
  const d = s.get(l), m = s.get(i);
  if (d != null && m != null)
    return d === i;
  s.set(l, i), s.set(i, l);
  try {
    switch (o) {
      case Hp: {
        if (l.size !== i.size)
          return !1;
        for (const [g, S] of l.entries())
          if (!i.has(g) || !Ui(S, i.get(g), g, l, i, s, c))
            return !1;
        return !0;
      }
      case Bp: {
        if (l.size !== i.size)
          return !1;
        const g = Array.from(l.values()), S = Array.from(i.values());
        for (let A = 0; A < g.length; A++) {
          const w = g[A], N = S.findIndex((_) => Ui(w, _, void 0, l, i, s, c));
          if (N === -1)
            return !1;
          S.splice(N, 1);
        }
        return !0;
      }
      case _p:
      case Xp:
      case Yp:
      case Qp:
      case Gp:
      case Jv:
      case Zp:
      case Vp:
      case Kp:
      case Fv:
      case Pp:
      case Jp: {
        if (vf(l) !== vf(i) || l.length !== i.length)
          return !1;
        for (let g = 0; g < l.length; g++)
          if (!Ui(l[g], i[g], g, l, i, s, c))
            return !1;
        return !0;
      }
      case Cp:
        return l.byteLength !== i.byteLength ? !1 : ji(new Uint8Array(l), new Uint8Array(i), s, c);
      case Lp:
        return l.byteLength !== i.byteLength || l.byteOffset !== i.byteOffset ? !1 : ji(new Uint8Array(l), new Uint8Array(i), s, c);
      case Pv:
        return l.name === i.name && l.message === i.message;
      case os: {
        if (!(ji(l.constructor, i.constructor, s, c) || Vm(l) && Vm(i)))
          return !1;
        const S = [...Object.keys(l), ...yf(l)], A = [...Object.keys(i), ...yf(i)];
        if (S.length !== A.length)
          return !1;
        for (let w = 0; w < S.length; w++) {
          const N = S[w], _ = l[N];
          if (!Object.hasOwn(i, N))
            return !1;
          const B = i[N];
          if (!Ui(_, B, N, l, i, s, c))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    s.delete(l), s.delete(i);
  }
}
function Hi(l, i) {
  return Wv(l, i, Gv);
}
function $p(l) {
  switch (typeof l) {
    case "number":
    case "symbol":
      return !1;
    case "string":
      return l.includes(".") || l.includes("[") || l.includes("]");
  }
}
function Uf(l) {
  return typeof l == "string" || typeof l == "symbol" ? l : Object.is(l?.valueOf?.(), -0) ? "-0" : String(l);
}
function Wp(l) {
  if (l == null)
    return "";
  if (typeof l == "string")
    return l;
  if (Array.isArray(l))
    return l.map(Wp).join(",");
  const i = String(l);
  return i === "0" && Object.is(Number(l), -0) ? "-0" : i;
}
function Nf(l) {
  if (Array.isArray(l))
    return l.map(Uf);
  if (typeof l == "symbol")
    return [l];
  l = Wp(l);
  const i = [], s = l.length;
  if (s === 0)
    return i;
  let c = 0, o = "", p = "", d = !1;
  for (l.charCodeAt(0) === 46 && (i.push(""), c++); c < s; ) {
    const m = l[c];
    p ? m === "\\" && c + 1 < s ? (c++, o += l[c]) : m === p ? p = "" : o += m : d ? m === '"' || m === "'" ? p = m : m === "]" ? (d = !1, i.push(o), o = "") : o += m : m === "[" ? (d = !0, o && (i.push(o), o = "")) : m === "." ? o && (i.push(o), o = "") : o += m, c++;
  }
  return o && i.push(o), i;
}
function mt(l, i, s) {
  if (l == null)
    return s;
  switch (typeof i) {
    case "string": {
      if (bs(i))
        return s;
      const c = l[i];
      return c === void 0 ? $p(i) ? mt(l, Nf(i), s) : s : c;
    }
    case "number":
    case "symbol": {
      typeof i == "number" && (i = Uf(i));
      const c = l[i];
      return c === void 0 ? s : c;
    }
    default: {
      if (Array.isArray(i))
        return kv(l, i, s);
      if (Object.is(i?.valueOf(), -0) ? i = "-0" : i = String(i), bs(i))
        return s;
      const c = l[i];
      return c === void 0 ? s : c;
    }
  }
}
function kv(l, i, s) {
  if (i.length === 0)
    return s;
  let c = l;
  for (let o = 0; o < i.length; o++) {
    if (c == null || bs(i[o]))
      return s;
    c = c[i[o]];
  }
  return c === void 0 ? s : c;
}
function Km(l) {
  return l !== null && (typeof l == "object" || typeof l == "function");
}
const Iv = /^(?:0|[1-9]\d*)$/;
function kp(l, i = Number.MAX_SAFE_INTEGER) {
  switch (typeof l) {
    case "number":
      return Number.isInteger(l) && l >= 0 && l < i;
    case "symbol":
      return !1;
    case "string":
      return Iv.test(l);
  }
}
function eS(l) {
  return l !== null && typeof l == "object" && Ss(l) === "[object Arguments]";
}
function tS(l, i) {
  let s;
  if (Array.isArray(i) ? s = i : typeof i == "string" && $p(i) && l?.[i] == null ? s = Nf(i) : s = [i], s.length === 0)
    return !1;
  let c = l;
  for (let o = 0; o < s.length; o++) {
    const p = s[o];
    if ((c == null || !Object.hasOwn(c, p)) && !((Array.isArray(c) || eS(c)) && kp(p) && p < c.length))
      return !1;
    c = c[p];
  }
  return !0;
}
const nS = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, lS = /^\w*$/;
function aS(l, i) {
  return Array.isArray(l) ? !1 : typeof l == "number" || typeof l == "boolean" || l == null || Qv(l) ? !0 : typeof l == "string" && (lS.test(l) || !nS.test(l)) || i != null && Object.hasOwn(i, l);
}
const iS = (l, i, s) => {
  const c = l[i];
  (!(Object.hasOwn(l, i) && Fp(c, s)) || s === void 0 && !(i in l)) && (l[i] = s);
};
function rS(l, i, s, c) {
  if (l == null && !Km(l))
    return l;
  let o;
  aS(i, l) ? o = [i] : Array.isArray(i) ? o = i : o = Nf(i);
  const p = s(mt(l, o));
  let d = l;
  for (let m = 0; m < o.length && d != null; m++) {
    const g = Uf(o[m]);
    if (bs(g))
      continue;
    let S;
    if (m === o.length - 1)
      S = p;
    else {
      const A = d[g], w = c?.(A, g, l);
      S = w !== void 0 ? w : Km(A) ? A : kp(o[m + 1]) ? [] : {};
    }
    iS(d, g, S), d = d[g];
  }
  return l;
}
function _n(l, i, s) {
  return rS(l, i, () => s, () => {
  });
}
function Ip() {
}
function xf(l) {
  return l == null || typeof l != "object" && typeof l != "function";
}
function qf(l) {
  return ArrayBuffer.isView(l) && !(l instanceof DataView);
}
function sS(l) {
  if (xf(l))
    return l;
  if (Array.isArray(l) || qf(l) || l instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && l instanceof SharedArrayBuffer)
    return l.slice(0);
  const i = Object.getPrototypeOf(l), s = i.constructor;
  if (l instanceof Date || l instanceof Map || l instanceof Set)
    return new s(l);
  if (l instanceof RegExp) {
    const c = new s(l);
    return c.lastIndex = l.lastIndex, c;
  }
  if (l instanceof DataView)
    return new s(l.buffer.slice(0));
  if (l instanceof Error) {
    const c = new s(l.message);
    return c.stack = l.stack, c.name = l.name, c.cause = l.cause, c;
  }
  if (typeof File < "u" && l instanceof File)
    return new s([l], l.name, { type: l.type, lastModified: l.lastModified });
  if (typeof l == "object") {
    const c = Object.create(i);
    return Object.assign(c, l);
  }
  return l;
}
function Pm(l) {
  if (!l || typeof l != "object")
    return !1;
  const i = Object.getPrototypeOf(l);
  return i === null || i === Object.prototype || Object.getPrototypeOf(i) === null ? Object.prototype.toString.call(l) === "[object Object]" : !1;
}
function Jm(l) {
  return typeof l == "object" && l !== null;
}
function Es(l) {
  return Object.getOwnPropertySymbols(l).filter((i) => Object.prototype.propertyIsEnumerable.call(l, i));
}
function ws(l) {
  return l == null ? l === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(l);
}
const ey = "[object RegExp]", jf = "[object String]", Hf = "[object Number]", Bf = "[object Boolean]", As = "[object Arguments]", ty = "[object Symbol]", ny = "[object Date]", ly = "[object Map]", ay = "[object Set]", iy = "[object Array]", uS = "[object Function]", ry = "[object ArrayBuffer]", ds = "[object Object]", cS = "[object Error]", sy = "[object DataView]", uy = "[object Uint8Array]", cy = "[object Uint8ClampedArray]", fy = "[object Uint16Array]", oy = "[object Uint32Array]", fS = "[object BigUint64Array]", dy = "[object Int8Array]", hy = "[object Int16Array]", my = "[object Int32Array]", oS = "[object BigInt64Array]", py = "[object Float32Array]", yy = "[object Float64Array]";
function dS(l, i) {
  return Ra(l, void 0, l, /* @__PURE__ */ new Map(), i);
}
function Ra(l, i, s, c = /* @__PURE__ */ new Map(), o = void 0) {
  const p = o?.(l, i, s, c);
  if (p != null)
    return p;
  if (xf(l))
    return l;
  if (c.has(l))
    return c.get(l);
  if (Array.isArray(l)) {
    const d = new Array(l.length);
    c.set(l, d);
    for (let m = 0; m < l.length; m++)
      d[m] = Ra(l[m], m, s, c, o);
    return Object.hasOwn(l, "index") && (d.index = l.index), Object.hasOwn(l, "input") && (d.input = l.input), d;
  }
  if (l instanceof Date)
    return new Date(l.getTime());
  if (l instanceof RegExp) {
    const d = new RegExp(l.source, l.flags);
    return d.lastIndex = l.lastIndex, d;
  }
  if (l instanceof Map) {
    const d = /* @__PURE__ */ new Map();
    c.set(l, d);
    for (const [m, g] of l)
      d.set(m, Ra(g, m, s, c, o));
    return d;
  }
  if (l instanceof Set) {
    const d = /* @__PURE__ */ new Set();
    c.set(l, d);
    for (const m of l)
      d.add(Ra(m, void 0, s, c, o));
    return d;
  }
  if (typeof Buffer < "u" && Buffer.isBuffer(l))
    return l.subarray();
  if (qf(l)) {
    const d = new (Object.getPrototypeOf(l)).constructor(l.length);
    c.set(l, d);
    for (let m = 0; m < l.length; m++)
      d[m] = Ra(l[m], m, s, c, o);
    return d;
  }
  if (l instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && l instanceof SharedArrayBuffer)
    return l.slice(0);
  if (l instanceof DataView) {
    const d = new DataView(l.buffer.slice(0), l.byteOffset, l.byteLength);
    return c.set(l, d), ql(d, l, s, c, o), d;
  }
  if (typeof File < "u" && l instanceof File) {
    const d = new File([l], l.name, {
      type: l.type
    });
    return c.set(l, d), ql(d, l, s, c, o), d;
  }
  if (l instanceof Blob) {
    const d = new Blob([l], { type: l.type });
    return c.set(l, d), ql(d, l, s, c, o), d;
  }
  if (l instanceof Error) {
    const d = new l.constructor();
    return c.set(l, d), d.message = l.message, d.name = l.name, d.stack = l.stack, d.cause = l.cause, ql(d, l, s, c, o), d;
  }
  if (typeof l == "object" && hS(l)) {
    const d = Object.create(Object.getPrototypeOf(l));
    return c.set(l, d), ql(d, l, s, c, o), d;
  }
  return l;
}
function ql(l, i, s = l, c, o) {
  const p = [...Object.keys(i), ...Es(i)];
  for (let d = 0; d < p.length; d++) {
    const m = p[d], g = Object.getOwnPropertyDescriptor(l, m);
    (g == null || g.writable) && (l[m] = Ra(i[m], m, s, c, o));
  }
}
function hS(l) {
  switch (ws(l)) {
    case As:
    case iy:
    case ry:
    case sy:
    case Bf:
    case ny:
    case py:
    case yy:
    case dy:
    case hy:
    case my:
    case ly:
    case Hf:
    case ds:
    case ey:
    case ay:
    case jf:
    case ty:
    case uy:
    case cy:
    case fy:
    case oy:
      return !0;
    default:
      return !1;
  }
}
function mS(l, i) {
  return l === i || Number.isNaN(l) && Number.isNaN(i);
}
function pS(l, i, s) {
  return Ni(l, i, void 0, void 0, void 0, void 0, s);
}
function Ni(l, i, s, c, o, p, d) {
  const m = d(l, i, s, c, o, p);
  if (m !== void 0)
    return m;
  if (typeof l == typeof i)
    switch (typeof l) {
      case "bigint":
      case "string":
      case "boolean":
      case "symbol":
      case "undefined":
        return l === i;
      case "number":
        return l === i || Object.is(l, i);
      case "function":
        return l === i;
      case "object":
        return Bi(l, i, p, d);
    }
  return Bi(l, i, p, d);
}
function Bi(l, i, s, c) {
  if (Object.is(l, i))
    return !0;
  let o = ws(l), p = ws(i);
  if (o === As && (o = ds), p === As && (p = ds), o !== p)
    return !1;
  switch (o) {
    case jf:
      return l.toString() === i.toString();
    case Hf: {
      const g = l.valueOf(), S = i.valueOf();
      return mS(g, S);
    }
    case Bf:
    case ny:
    case ty:
      return Object.is(l.valueOf(), i.valueOf());
    case ey:
      return l.source === i.source && l.flags === i.flags;
    case uS:
      return l === i;
  }
  s = s ?? /* @__PURE__ */ new Map();
  const d = s.get(l), m = s.get(i);
  if (d != null && m != null)
    return d === i;
  s.set(l, i), s.set(i, l);
  try {
    switch (o) {
      case ly: {
        if (l.size !== i.size)
          return !1;
        for (const [g, S] of l.entries())
          if (!i.has(g) || !Ni(S, i.get(g), g, l, i, s, c))
            return !1;
        return !0;
      }
      case ay: {
        if (l.size !== i.size)
          return !1;
        const g = Array.from(l.values()), S = Array.from(i.values());
        for (let A = 0; A < g.length; A++) {
          const w = g[A], N = S.findIndex((_) => Ni(w, _, void 0, l, i, s, c));
          if (N === -1)
            return !1;
          S.splice(N, 1);
        }
        return !0;
      }
      case iy:
      case uy:
      case cy:
      case fy:
      case oy:
      case fS:
      case dy:
      case hy:
      case my:
      case oS:
      case py:
      case yy: {
        if (typeof Buffer < "u" && Buffer.isBuffer(l) !== Buffer.isBuffer(i) || l.length !== i.length)
          return !1;
        for (let g = 0; g < l.length; g++)
          if (!Ni(l[g], i[g], g, l, i, s, c))
            return !1;
        return !0;
      }
      case ry:
        return l.byteLength !== i.byteLength ? !1 : Bi(new Uint8Array(l), new Uint8Array(i), s, c);
      case sy:
        return l.byteLength !== i.byteLength || l.byteOffset !== i.byteOffset ? !1 : Bi(new Uint8Array(l), new Uint8Array(i), s, c);
      case cS:
        return l.name === i.name && l.message === i.message;
      case ds: {
        if (!(Bi(l.constructor, i.constructor, s, c) || Pm(l) && Pm(i)))
          return !1;
        const S = [...Object.keys(l), ...Es(l)], A = [...Object.keys(i), ...Es(i)];
        if (S.length !== A.length)
          return !1;
        for (let w = 0; w < S.length; w++) {
          const N = S[w], _ = l[N];
          if (!Object.hasOwn(i, N))
            return !1;
          const B = i[N];
          if (!Ni(_, B, N, l, i, s, c))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    s.delete(l), s.delete(i);
  }
}
function yS(l, i) {
  return pS(l, i, Ip);
}
function gS(l) {
  switch (typeof l) {
    case "number":
    case "symbol":
      return !1;
    case "string":
      return l.includes(".") || l.includes("[") || l.includes("]");
  }
}
function vS(l) {
  return Object.is(l, -0) ? "-0" : l.toString();
}
function gy(l) {
  const i = [], s = l.length;
  if (s === 0)
    return i;
  let c = 0, o = "", p = "", d = !1;
  for (l.charCodeAt(0) === 46 && (i.push(""), c++); c < s; ) {
    const m = l[c];
    p ? m === "\\" && c + 1 < s ? (c++, o += l[c]) : m === p ? p = "" : o += m : d ? m === '"' || m === "'" ? p = m : m === "]" ? (d = !1, i.push(o), o = "") : o += m : m === "[" ? (d = !0, o && (i.push(o), o = "")) : m === "." ? o && (i.push(o), o = "") : o += m, c++;
  }
  return o && i.push(o), i;
}
function Os(l, i, s) {
  if (l == null)
    return s;
  switch (typeof i) {
    case "string": {
      const c = l[i];
      return c === void 0 ? gS(i) ? Os(l, gy(i), s) : s : c;
    }
    case "number":
    case "symbol": {
      typeof i == "number" && (i = vS(i));
      const c = l[i];
      return c === void 0 ? s : c;
    }
    default: {
      if (Array.isArray(i))
        return SS(l, i, s);
      Object.is(i?.valueOf(), -0) ? i = "-0" : i = String(i);
      const c = l[i];
      return c === void 0 ? s : c;
    }
  }
}
function SS(l, i, s) {
  if (i.length === 0)
    return s;
  let c = l;
  for (let o = 0; o < i.length; o++) {
    if (c == null)
      return s;
    c = c[i[o]];
  }
  return c === void 0 ? s : c;
}
function bS(l, i) {
  return dS(l, (s, c, o, p) => {
    if (typeof l == "object")
      switch (Object.prototype.toString.call(l)) {
        case Hf:
        case jf:
        case Bf: {
          const d = new l.constructor(l?.valueOf());
          return ql(d, l), d;
        }
        case As: {
          const d = {};
          return ql(d, l), d.length = l.length, d[Symbol.iterator] = l[Symbol.iterator], d;
        }
        default:
          return;
      }
  });
}
function Fm(l) {
  return bS(l);
}
const ES = /^(?:0|[1-9]\d*)$/;
function wS(l, i = Number.MAX_SAFE_INTEGER) {
  switch (typeof l) {
    case "number":
      return Number.isInteger(l) && l >= 0 && l < i;
    case "symbol":
      return !1;
    case "string":
      return ES.test(l);
  }
}
function $m(l) {
  return l !== null && typeof l == "object" && ws(l) === "[object Arguments]";
}
function AS(l, i, s) {
  const c = Array.isArray(i) ? i : typeof i == "string" ? gy(i) : [i];
  let o = l;
  for (let d = 0; d < c.length - 1; d++) {
    const m = c[d], g = c[d + 1];
    o[m] == null && (o[m] = wS(g) ? [] : {}), o = o[m];
  }
  const p = c[c.length - 1];
  return o[p] = s, l;
}
function OS(l, i, { signal: s, edges: c } = {}) {
  let o, p = null;
  const d = c != null && c.includes("leading"), m = c == null || c.includes("trailing"), g = () => {
    p !== null && (l.apply(o, p), o = void 0, p = null);
  }, S = () => {
    m && g(), _();
  };
  let A = null;
  const w = () => {
    A != null && clearTimeout(A), A = setTimeout(() => {
      A = null, S();
    }, i);
  }, N = () => {
    A !== null && (clearTimeout(A), A = null);
  }, _ = () => {
    N(), o = void 0, p = null;
  }, B = () => {
    N(), g();
  }, Z = function(...oe) {
    if (s?.aborted)
      return;
    o = this, p = oe;
    const C = A == null;
    w(), d && C && g();
  };
  return Z.schedule = w, Z.cancel = _, Z.flush = B, s?.addEventListener("abort", _, { once: !0 }), Z;
}
function RS(l, i = 0, s = {}) {
  typeof s != "object" && (s = {});
  const { signal: c, leading: o = !1, trailing: p = !0, maxWait: d } = s, m = Array(2);
  o && (m[0] = "leading"), p && (m[1] = "trailing");
  let g, S = null;
  const A = OS(function(..._) {
    g = l.apply(this, _), S = null;
  }, i, { signal: c, edges: m }), w = function(..._) {
    if (d != null) {
      if (S === null)
        S = Date.now();
      else if (Date.now() - S >= d)
        return g = l.apply(this, _), S = Date.now(), A.cancel(), A.schedule(), g;
    }
    return A.apply(this, _), g;
  }, N = () => (A.flush(), g);
  return w.cancel = A.cancel, w.flush = N, w;
}
function zS(l) {
  return qf(l);
}
function DS(l) {
  if (typeof l != "object" || l == null)
    return !1;
  if (Object.getPrototypeOf(l) === null)
    return !0;
  if (Object.prototype.toString.call(l) !== "[object Object]") {
    const s = l[Symbol.toStringTag];
    return s == null || !Object.getOwnPropertyDescriptor(l, Symbol.toStringTag)?.writable ? !1 : l.toString() === `[object ${s}]`;
  }
  let i = l;
  for (; Object.getPrototypeOf(i) !== null; )
    i = Object.getPrototypeOf(i);
  return Object.getPrototypeOf(l) === i;
}
function MS(l, ...i) {
  const s = i.slice(0, -1), c = i[i.length - 1];
  let o = l;
  for (let p = 0; p < s.length; p++) {
    const d = s[p];
    o = hs(o, d, c, /* @__PURE__ */ new Map());
  }
  return o;
}
function hs(l, i, s, c) {
  if (xf(l) && (l = Object(l)), i == null || typeof i != "object")
    return l;
  if (c.has(i))
    return sS(c.get(i));
  if (c.set(i, l), Array.isArray(i)) {
    i = i.slice();
    for (let p = 0; p < i.length; p++)
      i[p] = i[p] ?? void 0;
  }
  const o = [...Object.keys(i), ...Es(i)];
  for (let p = 0; p < o.length; p++) {
    const d = o[p];
    let m = i[d], g = l[d];
    if ($m(m) && (m = { ...m }), $m(g) && (g = { ...g }), typeof Buffer < "u" && Buffer.isBuffer(m) && (m = Fm(m)), Array.isArray(m))
      if (typeof g == "object" && g != null) {
        const A = [], w = Reflect.ownKeys(g);
        for (let N = 0; N < w.length; N++) {
          const _ = w[N];
          A[_] = g[_];
        }
        g = A;
      } else
        g = [];
    const S = s(g, m, d, l, i, c);
    S != null ? l[d] = S : Array.isArray(m) || Jm(g) && Jm(m) ? l[d] = hs(g, m, s, c) : g == null && DS(m) ? l[d] = hs({}, m, s, c) : g == null && zS(m) ? l[d] = Fm(m) : (g === void 0 || m !== void 0) && (l[d] = m);
  }
  return l;
}
function Rs(l, ...i) {
  return MS(l, ...i, Ip);
}
const _f = (l) => typeof File < "u" && l instanceof File || l instanceof Blob || typeof FileList < "u" && l instanceof FileList && l.length > 0, Cs = (l) => l instanceof FormData ? !0 : _f(l) || typeof l == "object" && l !== null && Object.values(l).some((i) => Cs(i));
let zs = class extends Error {
  response;
  constructor(i) {
    super(`HTTP error ${i.status}`), this.name = "HttpResponseError", this.response = i;
  }
}, vy = class extends Error {
  constructor(i = "Request was cancelled") {
    super(i), this.name = "HttpCancelledError";
  }
}, TS = class extends Error {
  constructor(i = "Network error") {
    super(i), this.name = "HttpNetworkError";
  }
};
function US(l) {
  const i = new URLSearchParams();
  return Object.entries(l).forEach(([s, c]) => {
    c != null && (Array.isArray(c) ? c.forEach((o) => i.append(`${s}[]`, String(o))) : typeof c == "object" ? i.append(s, JSON.stringify(c)) : i.append(s, String(c)));
  }), i.toString();
}
function NS(l, i, s) {
  if (i && !l.startsWith("http://") && !l.startsWith("https://") && (l = i.replace(/\/$/, "") + "/" + l.replace(/^\//, "")), s && Object.keys(s).length > 0) {
    const c = US(s);
    c && (l += (l.includes("?") ? "&" : "?") + c);
  }
  return l;
}
function xS() {
  return typeof window > "u" ? null : window.axios?.defaults?.headers?.common?.["X-Requested-With"] ?? null;
}
function Sy(l, i = new FormData(), s = null) {
  for (const c in l)
    Object.prototype.hasOwnProperty.call(l, c) && by(i, s ? `${s}[${c}]` : c, l[c]);
  return i;
}
function by(l, i, s) {
  if (Array.isArray(s))
    return s.forEach((c, o) => by(l, `${i}[${o}]`, c));
  if (s instanceof Date)
    return l.append(i, s.toISOString());
  if (typeof File < "u" && s instanceof File)
    return l.append(i, s, s.name);
  if (s instanceof Blob)
    return l.append(i, s);
  if (typeof s == "boolean")
    return l.append(i, s ? "1" : "0");
  if (typeof s == "string")
    return l.append(i, s);
  if (typeof s == "number")
    return l.append(i, `${s}`);
  if (s == null)
    return l.append(i, "");
  Sy(s, l, i);
}
function qS(l, i) {
  if (l != null)
    return l instanceof FormData ? l : typeof l == "object" && Cs(l) ? Sy(l) : typeof l == "object" || i["Content-Type"]?.includes("application/json") ? JSON.stringify(l) : String(l);
}
function jS(l) {
  const i = {};
  return l.forEach((s, c) => {
    i[c.toLowerCase()] = s;
  }), i;
}
function HS(l = {}) {
  let i = l.xsrfCookieName ?? "XSRF-TOKEN", s = l.xsrfHeaderName ?? "X-XSRF-TOKEN";
  function c() {
    if (typeof document > "u")
      return null;
    const o = document.cookie.match(new RegExp("(^|;\\s*)" + i + "=([^;]*)"));
    return o ? decodeURIComponent(o[2]) : null;
  }
  return {
    setXsrfCookieName(o) {
      i = o;
    },
    setXsrfHeaderName(o) {
      s = o;
    },
    async request(o) {
      const p = NS(o.url, o.baseURL, o.params), d = o.method.toUpperCase(), m = {}, g = xS();
      g && (m["X-Requested-With"] = g), o.data !== void 0 && !["GET", "DELETE"].includes(d) && !(o.data instanceof FormData) && !Cs(o.data) && (m["Content-Type"] = "application/json"), o.headers && Object.entries(o.headers).forEach(([B, Z]) => {
        Z !== void 0 && (m[B] = String(Z));
      });
      const S = c();
      S && !["GET", "HEAD", "OPTIONS"].includes(d) && (m[s] = S);
      let A = o.signal, w;
      const N = o.timeout ?? 3e4;
      if (N > 0 && !A) {
        const B = new AbortController();
        A = B.signal, w = setTimeout(() => B.abort(), N);
      }
      const _ = ["GET", "DELETE"].includes(d) ? void 0 : qS(o.data, m);
      _ instanceof FormData && delete m["Content-Type"];
      try {
        const B = await fetch(p, {
          method: d,
          headers: m,
          body: _,
          signal: A,
          credentials: o.credentials ?? "same-origin"
        });
        w && clearTimeout(w);
        let Z;
        B.headers.get("content-type")?.includes("application/json") ? Z = await B.json() : Z = await B.text();
        const C = {
          status: B.status,
          data: Z,
          headers: jS(B.headers)
        };
        if (!B.ok)
          throw new zs(C);
        return C;
      } catch (B) {
        throw w && clearTimeout(w), B instanceof zs ? B : B instanceof DOMException && B.name === "AbortError" ? new vy() : B instanceof TypeError ? new TS(B.message) : B;
      }
    }
  };
}
const Sf = HS();
let Cf = Sf, Lf, Ey, wy = "same-origin", Ay = (l) => `${l.method}:${l.baseURL ?? Lf ?? ""}${l.url}`, Oy = (l) => l.status === 204 && l.headers["precognition-success"] === "true";
const Ds = {}, gt = {
  get: (l, i = {}, s = {}) => Ai(wi("get", l, i, s)),
  post: (l, i = {}, s = {}) => Ai(wi("post", l, i, s)),
  patch: (l, i = {}, s = {}) => Ai(wi("patch", l, i, s)),
  put: (l, i = {}, s = {}) => Ai(wi("put", l, i, s)),
  delete: (l, i = {}, s = {}) => Ai(wi("delete", l, i, s)),
  useHttpClient(l) {
    return Cf = l, gt;
  },
  withBaseURL(l) {
    return Lf = l, gt;
  },
  withTimeout(l) {
    return Ey = l, gt;
  },
  withCredentials(l) {
    return wy = typeof l == "string" ? l : l ? "include" : "omit", gt;
  },
  fingerprintRequestsUsing(l) {
    return Ay = l === null ? () => null : l, gt;
  },
  determineSuccessUsing(l) {
    return Oy = l, gt;
  },
  withXsrfCookieName(l) {
    return Sf.setXsrfCookieName(l), gt;
  },
  withXsrfHeaderName(l) {
    return Sf.setXsrfHeaderName(l), gt;
  }
}, wi = (l, i, s, c) => ({
  url: i,
  method: l,
  ...c,
  ...["get", "delete"].includes(l) ? {
    params: Rs({}, s, c?.params)
  } : {
    data: Rs({}, s, c?.data)
  }
}), Ai = (l = {}) => {
  const i = [
    BS,
    CS,
    LS
  ].reduce((s, c) => c(s), l);
  return (i.onBefore ?? (() => !0))() === !1 ? Promise.resolve(null) : ((i.onStart ?? (() => null))(), Cf.request({
    method: i.method,
    url: i.url,
    baseURL: i.baseURL ?? Lf,
    data: i.data,
    params: i.params,
    headers: i.headers,
    signal: i.signal,
    timeout: i.timeout,
    credentials: wy
  }).then(async (s) => {
    i.precognitive && Wm(s);
    const c = s.status;
    let o = s;
    return i.precognitive && i.onPrecognitionSuccess && Oy(s) && (o = await Promise.resolve(i.onPrecognitionSuccess(s) ?? o)), i.onSuccess && _S(c) && (o = await Promise.resolve(i.onSuccess(o) ?? o)), (km(i, c) ?? ((d) => d))(o) ?? o;
  }, (s) => {
    if (XS(s))
      return Promise.reject(s);
    const c = s;
    return i.precognitive && Wm(c.response), (km(i, c.response.status) ?? ((p, d) => Promise.reject(d)))(c.response, c);
  }).finally(i.onFinish ?? (() => null)));
}, BS = (l) => {
  const i = l.only ?? l.validate;
  return {
    ...l,
    timeout: l.timeout ?? Ey,
    precognitive: l.precognitive !== !1,
    fingerprint: typeof l.fingerprint > "u" ? Ay(l, Cf) : l.fingerprint,
    headers: {
      ...l.headers,
      Accept: "application/json",
      "Content-Type": YS(l),
      ...l.precognitive !== !1 ? {
        Precognition: !0
      } : {},
      ...i ? {
        "Precognition-Validate-Only": Array.from(i).join()
      } : {}
    }
  };
}, _S = (l) => l >= 200 && l < 300, CS = (l) => (typeof l.fingerprint != "string" || (Ds[l.fingerprint]?.abort(), delete Ds[l.fingerprint]), l), LS = (l) => typeof l.fingerprint != "string" || l.signal || !l.precognitive ? l : (Ds[l.fingerprint] = new AbortController(), {
  ...l,
  signal: Ds[l.fingerprint].signal
}), Wm = (l) => {
  if (l.headers?.precognition !== "true")
    throw Error("Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.");
}, XS = (l) => !(l instanceof zs) || typeof l.response?.status != "number", km = (l, i) => ({
  401: l.onUnauthorized,
  403: l.onForbidden,
  404: l.onNotFound,
  409: l.onConflict,
  422: l.onValidationError,
  423: l.onLocked
})[i], YS = (l) => l.headers?.["Content-Type"] ?? l.headers?.["Content-type"] ?? l.headers?.["content-type"] ?? (Cs(l.data) ? "multipart/form-data" : "application/json"), QS = (l, i) => {
  if (!l.includes("*"))
    return [l];
  const s = l.split(".");
  let c = [""];
  for (const o of s)
    if (o === "*") {
      const p = [];
      for (const d of c) {
        const m = d ? Os(i, d) : i;
        if (Array.isArray(m))
          for (let g = 0; g < m.length; g++)
            p.push(d ? `${d}.${g}` : String(g));
        else if (m !== null && typeof m == "object")
          for (const g of Object.keys(m))
            p.push(d ? `${d}.${g}` : g);
      }
      c = p;
    } else
      c = c.map((p) => p ? `${p}.${o}` : o);
  return c;
}, GS = (l, i) => i.includes("*") ? new RegExp("^" + i.replace(/\./g, "\\.").replace(/\*/g, "[^.]+") + "$").test(l) : l === i, Im = (l, i) => Object.fromEntries(Object.entries(l).filter(([s]) => !i.some((c) => GS(s, c)))), ZS = (l, i = {}) => {
  const s = {
    errorsChanged: [],
    touchedChanged: [],
    validatingChanged: [],
    validatedChanged: []
  };
  let c = !1, o = !1;
  const p = (j) => j !== o ? (o = j, s.validatingChanged) : [];
  let d = [];
  const m = (j) => {
    const H = [...new Set(j)];
    return d.length !== H.length || !H.every((Y) => d.includes(Y)) ? (d = H, s.validatedChanged) : [];
  }, g = () => d.filter((j) => typeof w[j] > "u");
  let S = [];
  const A = (j) => {
    const H = [...new Set(j)];
    return S.length !== H.length || !H.every((Y) => S.includes(Y)) ? (S = H, s.touchedChanged) : [];
  };
  let w = {};
  const N = (j) => {
    const H = KS(j);
    return yS(w, H) ? [] : (w = H, s.errorsChanged);
  }, _ = (j) => {
    const H = { ...w };
    return delete H[_i(j)], N(H);
  }, B = () => Object.keys(w).length > 0;
  let Z = 1500;
  const oe = (j) => {
    Z = j, K.cancel(), K = Be();
  };
  let C = i, ce = null, me = [], fe = null;
  const Be = () => RS((j) => {
    l({
      get: (H, Y = {}, $ = {}) => gt.get(H, ue(Y), I($, j, Y)),
      post: (H, Y = {}, $ = {}) => gt.post(H, ue(Y), I($, j, Y)),
      patch: (H, Y = {}, $ = {}) => gt.patch(H, ue(Y), I($, j, Y)),
      put: (H, Y = {}, $ = {}) => gt.put(H, ue(Y), I($, j, Y)),
      delete: (H, Y = {}, $ = {}) => gt.delete(H, ue(Y), I($, j, Y))
    }).catch((H) => H instanceof vy || H instanceof zs && H.response?.status === 422 ? null : Promise.reject(H));
  }, Z, { leading: !0, trailing: !0 });
  let K = Be();
  const I = (j, H, Y = {}) => {
    const $ = {
      ...j,
      ...H
    }, be = Array.from($.only ?? $.validate ?? S);
    return {
      ...H,
      ...Rs({}, j, H),
      only: be,
      timeout: $.timeout ?? 5e3,
      onValidationError: (b, x) => ([
        ...m([...d, ...be]),
        ...N(Rs(Im({ ...w }, be), b.data.errors))
      ].forEach((L) => L()), $.onValidationError ? $.onValidationError(b, x) : Promise.reject(x)),
      onSuccess: (b) => (m([...d, ...be]).forEach((x) => x()), $.onSuccess ? $.onSuccess(b) : b),
      onPrecognitionSuccess: (b) => ([
        ...m([...d, ...be]),
        ...N(Im({ ...w }, be))
      ].forEach((x) => x()), $.onPrecognitionSuccess ? $.onPrecognitionSuccess(b) : b),
      onBefore: () => {
        const b = S.some((P) => P.includes("*")), x = b ? [...new Set(S.flatMap((P) => QS(P, Y)))] : S;
        return $.onBeforeValidation && $.onBeforeValidation({ data: Y, touched: x }, { data: C, touched: me }) === !1 || ($.onBefore || (() => !0))() === !1 ? !1 : (b && A(x).forEach((P) => P()), fe = S, ce = Y, !0);
      },
      onStart: () => {
        p(!0).forEach((b) => b()), ($.onStart ?? (() => null))();
      },
      onFinish: () => {
        p(!1).forEach((b) => b()), me = fe, C = ce, fe = ce = null, ($.onFinish ?? (() => null))();
      }
    };
  }, ne = (j, H, Y) => {
    if (typeof j > "u") {
      const $ = Array.from(Y?.only ?? Y?.validate ?? []);
      A([...S, ...$]).forEach((be) => be()), K(Y ?? {});
      return;
    }
    if (_f(H) && !c) {
      console.warn('Precognition file validation is not active. Call the "validateFiles" function on your form to enable it.');
      return;
    }
    j = _i(j), (j.includes("*") || Os(C, j) !== H) && (A([j, ...S]).forEach(($) => $()), K(Y ?? {}));
  }, ue = (j) => c === !1 ? bf(j) : j, V = {
    touched: () => S,
    validate(j, H, Y) {
      return typeof j == "object" && !("target" in j) && (Y = j, j = H = void 0), ne(j, H, Y), V;
    },
    touch(j) {
      const H = Array.isArray(j) ? j : [_i(j)];
      return A([...S, ...H]).forEach((Y) => Y()), V;
    },
    validating: () => o,
    valid: g,
    errors: () => w,
    hasErrors: B,
    setErrors(j) {
      return N(j).forEach((H) => H()), V;
    },
    forgetError(j) {
      return _(j).forEach((H) => H()), V;
    },
    defaults(j) {
      return i = j, C = j, V;
    },
    reset(...j) {
      if (j.length === 0)
        A([]).forEach((H) => H());
      else {
        const H = [...S];
        j.forEach((Y) => {
          H.includes(Y) && H.splice(H.indexOf(Y), 1), AS(C, Y, Os(i, Y));
        }), A(H).forEach((Y) => Y());
      }
      return V;
    },
    setTimeout(j) {
      return oe(j), V;
    },
    on(j, H) {
      return s[j].push(H), V;
    },
    validateFiles() {
      return c = !0, V;
    },
    withoutFileValidation() {
      return c = !1, V;
    }
  };
  return V;
}, VS = (l) => Object.keys(l).reduce((i, s) => ({
  ...i,
  [s]: Array.isArray(l[s]) ? l[s][0] : l[s]
}), {}), KS = (l) => Object.keys(l).reduce((i, s) => ({
  ...i,
  [s]: typeof l[s] == "string" ? [l[s]] : l[s]
}), {}), _i = (l) => typeof l != "string" ? l.target.name : l, bf = (l) => {
  const i = { ...l };
  return Object.keys(i).forEach((s) => {
    const c = i[s];
    if (c !== null) {
      if (_f(c)) {
        delete i[s];
        return;
      }
      if (Array.isArray(c)) {
        i[s] = Object.values(bf({ ...c }));
        return;
      }
      if (typeof c == "object") {
        i[s] = bf(i[s]);
        return;
      }
    }
  }), i;
};
var PS = class {
  config = {};
  defaults;
  constructor(l) {
    this.defaults = l;
  }
  extend(l) {
    return l && (this.defaults = { ...this.defaults, ...l }), this;
  }
  replace(l) {
    this.config = l;
  }
  get(l) {
    return tS(this.config, l) ? mt(this.config, l) : mt(this.defaults, l);
  }
  set(l, i) {
    typeof l == "string" ? _n(this.config, l, i) : Object.entries(l).forEach(([s, c]) => {
      _n(this.config, s, c);
    });
  }
}, Yi = new PS({
  form: {
    recentlySuccessfulDuration: 2e3,
    forceIndicesArrayFormatInFormData: !0,
    withAllErrors: !1
  },
  prefetch: {
    cacheFor: 3e4,
    hoverDelay: 75
  }
});
function Ms(l, i) {
  let s;
  return function(...c) {
    clearTimeout(s), s = setTimeout(() => l.apply(this, c), i);
  };
}
function Qt(l, i) {
  return document.dispatchEvent(new CustomEvent(`inertia:${l}`, i));
}
var ep = (l) => Qt("before", { cancelable: !0, detail: { visit: l } }), JS = (l) => Qt("error", { detail: { errors: l } }), FS = (l) => Qt("networkError", { cancelable: !0, detail: { error: l } }), $S = (l) => Qt("finish", { detail: { visit: l } }), tp = (l) => Qt("httpException", { cancelable: !0, detail: { response: l } }), WS = (l) => Qt("beforeUpdate", { detail: { page: l } }), Ts = (l) => Qt("navigate", { detail: { page: l } }), kS = (l) => Qt("progress", { detail: { progress: l } }), IS = (l) => Qt("start", { detail: { visit: l } }), eb = (l) => Qt("success", { detail: { page: l } }), tb = (l, i) => Qt("prefetched", { detail: { fetchedAt: Date.now(), response: l, visit: i } }), nb = (l) => Qt("prefetching", { detail: { visit: l } }), Us = (l) => Qt("flash", { detail: { flash: l } }), Mt = class {
  static locationVisitKey = "inertiaLocationVisit";
  static set(l, i) {
    typeof window < "u" && window.sessionStorage.setItem(l, JSON.stringify(i));
  }
  static get(l) {
    if (typeof window < "u")
      return JSON.parse(window.sessionStorage.getItem(l) || "null");
  }
  static merge(l, i) {
    const s = this.get(l);
    s === null ? this.set(l, i) : this.set(l, { ...s, ...i });
  }
  static remove(l) {
    typeof window < "u" && window.sessionStorage.removeItem(l);
  }
  static removeNested(l, i) {
    const s = this.get(l);
    s !== null && (delete s[i], this.set(l, s));
  }
  static exists(l) {
    try {
      return this.get(l) !== null;
    } catch {
      return !1;
    }
  }
  static clear() {
    typeof window < "u" && window.sessionStorage.clear();
  }
}, lb = async (l) => {
  if (typeof window > "u")
    throw new Error("Unable to encrypt history");
  const i = Ry(), s = await zy(), c = await cb(s);
  if (!c)
    throw new Error("Unable to encrypt history");
  return await ib(i, c, l);
}, Da = {
  key: "historyKey",
  iv: "historyIv"
}, ab = async (l) => {
  const i = Ry(), s = await zy();
  if (!s)
    throw new Error("Unable to decrypt history");
  return await rb(i, s, l);
}, ib = async (l, i, s) => {
  if (typeof window > "u")
    throw new Error("Unable to encrypt history");
  if (typeof window.crypto.subtle > "u")
    return console.warn("Encryption is not supported in this environment. SSL is required."), Promise.resolve(s);
  const c = new TextEncoder(), o = JSON.stringify(s), p = new Uint8Array(o.length * 3), d = c.encodeInto(o, p);
  return window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: l
    },
    i,
    p.subarray(0, d.written)
  );
}, rb = async (l, i, s) => {
  if (typeof window.crypto.subtle > "u")
    return console.warn("Decryption is not supported in this environment. SSL is required."), Promise.resolve(s);
  const c = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: l
    },
    i,
    s
  );
  return JSON.parse(new TextDecoder().decode(c));
}, Ry = () => {
  const l = Mt.get(Da.iv);
  if (l)
    return new Uint8Array(l);
  const i = window.crypto.getRandomValues(new Uint8Array(12));
  return Mt.set(Da.iv, Array.from(i)), i;
}, sb = async () => typeof window.crypto.subtle > "u" ? (console.warn("Encryption is not supported in this environment. SSL is required."), Promise.resolve(null)) : window.crypto.subtle.generateKey(
  {
    name: "AES-GCM",
    length: 256
  },
  !0,
  ["encrypt", "decrypt"]
), ub = async (l) => {
  if (typeof window.crypto.subtle > "u")
    return console.warn("Encryption is not supported in this environment. SSL is required."), Promise.resolve();
  const i = await window.crypto.subtle.exportKey("raw", l);
  Mt.set(Da.key, Array.from(new Uint8Array(i)));
}, cb = async (l) => {
  if (l)
    return l;
  const i = await sb();
  return i ? (await ub(i), i) : null;
}, zy = async () => {
  const l = Mt.get(Da.key);
  return l ? await window.crypto.subtle.importKey(
    "raw",
    new Uint8Array(l),
    {
      name: "AES-GCM",
      length: 256
    },
    !0,
    ["encrypt", "decrypt"]
  ) : null;
}, Dy = (l, i, s) => {
  if (l === i)
    return !0;
  for (const c in l)
    if (!s.includes(c) && l[c] !== i[c] && !fb(l[c], i[c]))
      return !1;
  for (const c in i)
    if (!s.includes(c) && !(c in l))
      return !1;
  return !0;
}, fb = (l, i) => {
  switch (typeof l) {
    case "object":
      return Dy(l, i, []);
    case "function":
      return l.toString() === i.toString();
    default:
      return l === i;
  }
}, ob = {
  ms: 1,
  s: 1e3,
  m: 1e3 * 60,
  h: 1e3 * 60 * 60,
  d: 1e3 * 60 * 60 * 24
}, np = (l) => {
  if (typeof l == "number")
    return l;
  for (const [i, s] of Object.entries(ob))
    if (l.endsWith(i))
      return parseFloat(l) * s;
  return parseInt(l);
}, db = class {
  cached = [];
  inFlightRequests = [];
  removalTimers = [];
  currentUseId = null;
  add(l, i, { cacheFor: s, cacheTags: c }) {
    if (this.findInFlight(l))
      return Promise.resolve();
    const p = this.findCached(l);
    if (!l.fresh && p && p.staleTimestamp > Date.now())
      return Promise.resolve();
    const [d, m] = this.extractStaleValues(s), g = new Promise((S, A) => {
      i({
        ...l,
        onCancel: () => {
          this.remove(l), l.onCancel(), A();
        },
        onError: (w) => {
          this.remove(l), l.onError(w), A();
        },
        onPrefetching(w) {
          l.onPrefetching(w);
        },
        onPrefetched(w, N) {
          l.onPrefetched(w, N);
        },
        onPrefetchResponse(w) {
          S(w);
        },
        onPrefetchError(w) {
          pn.removeFromInFlight(l), A(w);
        }
      });
    }).then((S) => {
      this.remove(l);
      const A = S.getPageResponse();
      q.mergeOncePropsIntoResponse(A), this.cached.push({
        params: { ...l },
        staleTimestamp: Date.now() + d,
        expiresAt: Date.now() + m,
        response: g,
        singleUse: m === 0,
        timestamp: Date.now(),
        inFlight: !1,
        tags: Array.isArray(c) ? c : [c]
      });
      const w = this.getShortestOncePropTtl(A);
      return this.scheduleForRemoval(
        l,
        w ? Math.min(m, w) : m
      ), this.removeFromInFlight(l), S.handlePrefetch(), S;
    });
    return this.inFlightRequests.push({
      params: { ...l },
      response: g,
      staleTimestamp: null,
      inFlight: !0
    }), g;
  }
  removeAll() {
    this.cached = [], this.removalTimers.forEach((l) => {
      clearTimeout(l.timer);
    }), this.removalTimers = [];
  }
  removeByTags(l) {
    this.cached = this.cached.filter((i) => !i.tags.some((s) => l.includes(s)));
  }
  remove(l) {
    this.cached = this.cached.filter((i) => !this.paramsAreEqual(i.params, l)), this.clearTimer(l);
  }
  removeFromInFlight(l) {
    this.inFlightRequests = this.inFlightRequests.filter((i) => !this.paramsAreEqual(i.params, l));
  }
  extractStaleValues(l) {
    const [i, s] = this.cacheForToStaleAndExpires(l);
    return [np(i), np(s)];
  }
  cacheForToStaleAndExpires(l) {
    if (!Array.isArray(l))
      return [l, l];
    switch (l.length) {
      case 0:
        return [0, 0];
      case 1:
        return [l[0], l[0]];
      default:
        return [l[0], l[1]];
    }
  }
  clearTimer(l) {
    const i = this.removalTimers.find((s) => this.paramsAreEqual(s.params, l));
    i && (clearTimeout(i.timer), this.removalTimers = this.removalTimers.filter((s) => s !== i));
  }
  scheduleForRemoval(l, i) {
    if (!(typeof window > "u") && (this.clearTimer(l), i > 0)) {
      const s = window.setTimeout(() => this.remove(l), i);
      this.removalTimers.push({
        params: l,
        timer: s
      });
    }
  }
  get(l) {
    return this.findCached(l) || this.findInFlight(l);
  }
  use(l, i) {
    const s = `${i.url.pathname}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return this.currentUseId = s, l.response.then((c) => {
      if (this.currentUseId === s)
        return c.mergeParams({ ...i, onPrefetched: () => {
        } }), this.removeSingleUseItems(i), c.handle();
    });
  }
  removeSingleUseItems(l) {
    this.cached = this.cached.filter((i) => this.paramsAreEqual(i.params, l) ? !i.singleUse : !0);
  }
  findCached(l) {
    return this.cached.find((i) => this.paramsAreEqual(i.params, l)) || null;
  }
  findInFlight(l) {
    return this.inFlightRequests.find((i) => this.paramsAreEqual(i.params, l)) || null;
  }
  withoutPurposePrefetchHeader(l) {
    const i = sn(l);
    return i.headers.Purpose === "prefetch" && delete i.headers.Purpose, i;
  }
  paramsAreEqual(l, i) {
    return Dy(
      this.withoutPurposePrefetchHeader(l),
      this.withoutPurposePrefetchHeader(i),
      [
        "showProgress",
        "replace",
        "prefetch",
        "preserveScroll",
        "preserveState",
        "onBefore",
        "onBeforeUpdate",
        "onStart",
        "onProgress",
        "onFinish",
        "onCancel",
        "onSuccess",
        "onError",
        "onFlash",
        "onPrefetched",
        "onCancelToken",
        "onPrefetching",
        "async",
        "viewTransition",
        "optimistic",
        "component",
        "pageProps"
      ]
    );
  }
  updateCachedOncePropsFromCurrentPage() {
    this.cached.forEach((l) => {
      l.response.then((i) => {
        const s = i.getPageResponse();
        q.mergeOncePropsIntoResponse(s, { force: !0 });
        for (const [d, m] of Object.entries(s.deferredProps ?? {})) {
          const g = m.filter((S) => mt(s.props, S) === void 0);
          g.length > 0 ? s.deferredProps[d] = g : delete s.deferredProps[d];
        }
        const c = this.getShortestOncePropTtl(s);
        if (c === null)
          return;
        const o = l.expiresAt - Date.now(), p = Math.min(o, c);
        p > 0 ? this.scheduleForRemoval(l.params, p) : this.remove(l.params);
      });
    });
  }
  getShortestOncePropTtl(l) {
    const i = Object.values(l.onceProps ?? {}).map((s) => s.expiresAt).filter((s) => !!s);
    return i.length === 0 ? null : Math.min(...i) - Date.now();
  }
}, pn = new db(), tf = (l) => {
  if (l.offsetParent === null)
    return !1;
  const i = l.getBoundingClientRect(), s = i.top < window.innerHeight && i.bottom >= 0, c = i.left < window.innerWidth && i.right >= 0;
  return s && c;
}, hb = (l) => {
  const i = (d) => {
    const m = window.getComputedStyle(d);
    return m.overflowY === "scroll" ? !0 : m.overflowY !== "auto" ? !1 : ["visible", "clip"].includes(m.overflowX) ? !0 : c(m.maxHeight, d.style.height) || o(d, "height");
  }, s = (d) => {
    const m = window.getComputedStyle(d);
    return m.overflowX === "scroll" ? !0 : m.overflowX !== "auto" ? !1 : ["visible", "clip"].includes(m.overflowY) ? !0 : c(m.maxWidth, d.style.width) || o(d, "width");
  }, c = (d, m) => !!(d && d !== "none" && d !== "0px" || m && m !== "auto" && m !== "0"), o = (d, m) => {
    const g = d.parentElement;
    if (!g)
      return !1;
    const S = window.getComputedStyle(g);
    if (["flex", "inline-flex"].includes(S.display)) {
      const A = ["column", "column-reverse"].includes(S.flexDirection);
      return m === "height" ? A : !A;
    }
    return ["grid", "inline-grid"].includes(S.display);
  };
  let p = l?.parentElement;
  for (; p; ) {
    const d = i(p) || s(p);
    if (window.getComputedStyle(p).display !== "contents" && d)
      return p;
    p = p.parentElement;
  }
  return null;
}, My = (l, i) => {
  if (!i)
    return l.filter((p) => tf(p));
  const s = l.indexOf(i), c = [], o = [];
  for (let p = s; p >= 0; p--) {
    const d = l[p];
    if (tf(d))
      c.push(d);
    else
      break;
  }
  for (let p = s + 1; p < l.length; p++) {
    const d = l[p];
    if (tf(d))
      o.push(d);
    else
      break;
  }
  return [...c.reverse(), ...o];
}, Ci = (l, i = 1) => {
  window.requestAnimationFrame(() => {
    i > 1 ? Ci(l, i - 1) : l();
  });
}, xi = typeof window > "u", mb = !xi && /Firefox/i.test(window.navigator.userAgent), Tt = class {
  static save() {
    Se.saveScrollPositions(this.getScrollRegions());
  }
  static getScrollRegions() {
    return Array.from(this.regions()).map((l) => ({
      top: l.scrollTop,
      left: l.scrollLeft
    }));
  }
  static regions() {
    return document.querySelectorAll("[scroll-region]");
  }
  static scrollToTop() {
    if (mb && getComputedStyle(document.documentElement).scrollBehavior === "smooth")
      return Ci(() => window.scrollTo(0, 0), 2);
    window.scrollTo(0, 0);
  }
  static reset() {
    !xi && window.location.hash || this.scrollToTop(), this.regions().forEach((i) => {
      typeof i.scrollTo == "function" ? i.scrollTo(0, 0) : (i.scrollTop = 0, i.scrollLeft = 0);
    }), this.save(), this.scrollToAnchor();
  }
  static scrollToAnchor() {
    const l = xi ? null : window.location.hash;
    l && setTimeout(() => {
      const i = document.getElementById(l.slice(1));
      i ? i.scrollIntoView() : this.scrollToTop();
    });
  }
  static restore(l) {
    xi || window.requestAnimationFrame(() => {
      this.restoreDocument(), this.restoreScrollRegions(l);
    });
  }
  static restoreScrollRegions(l) {
    xi || this.regions().forEach((i, s) => {
      const c = l[s];
      c && (typeof i.scrollTo == "function" ? i.scrollTo(c.left, c.top) : (i.scrollTop = c.top, i.scrollLeft = c.left));
    });
  }
  static restoreDocument() {
    const l = Se.getDocumentScrollPosition();
    window.scrollTo(l.left, l.top);
  }
  static onScroll(l) {
    const i = l.target;
    typeof i.hasAttribute == "function" && i.hasAttribute("scroll-region") && this.save();
  }
  static onWindowScroll() {
    Se.saveDocumentScrollPosition({
      top: window.scrollY,
      left: window.scrollX
    });
  }
}, Xf = (l) => typeof File < "u" && l instanceof File || l instanceof Blob || typeof FileList < "u" && l instanceof FileList && l.length > 0;
function Ef(l) {
  return Xf(l) || l instanceof FormData && Array.from(l.values()).some((i) => Ef(i)) || typeof l == "object" && l !== null && Object.values(l).some((i) => Ef(i));
}
var wf = (l) => l instanceof FormData;
function Ty(l, i = new FormData(), s = null, c = "brackets") {
  l = l || {};
  for (const o in l)
    Object.prototype.hasOwnProperty.call(l, o) && Ny(i, Uy(s, o, "indices"), l[o], c);
  return i;
}
function Uy(l, i, s) {
  return l ? s === "brackets" ? `${l}[]` : `${l}[${i}]` : i;
}
function Ny(l, i, s, c) {
  if (Array.isArray(s))
    return Array.from(s.keys()).forEach(
      (o) => Ny(l, Uy(i, o.toString(), c), s[o], c)
    );
  if (s instanceof Date)
    return l.append(i, s.toISOString());
  if (s instanceof File)
    return l.append(i, s, s.name);
  if (s instanceof Blob)
    return l.append(i, s);
  if (typeof s == "boolean")
    return l.append(i, s ? "1" : "0");
  if (typeof s == "string")
    return l.append(i, s);
  if (typeof s == "number")
    return l.append(i, `${s}`);
  if (s == null)
    return l.append(i, "");
  Ty(s, l, i, c);
}
function pb(l) {
  return /\[\d+\]/.test(decodeURIComponent(l.search));
}
function yb(l) {
  if (!l || l === "?")
    return {};
  const i = {};
  return l.replace(/^\?/, "").split("&").filter(Boolean).forEach((s) => {
    const [c, o] = vb(s);
    Sb(i, lp(c), lp(o));
  }), i;
}
function gb(l, i) {
  const s = [];
  return Af(l, "", s, i), s.length ? "?" + s.join("&") : "";
}
function vb(l) {
  const i = l.indexOf("=");
  return i === -1 ? [l, ""] : [l.substring(0, i), l.substring(i + 1)];
}
function lp(l) {
  return decodeURIComponent(l.replace(/\+/g, " "));
}
function Sb(l, i, s) {
  const c = bb(i);
  let o = l;
  for (; c.length > 1; ) {
    const d = c.shift(), m = c[0] === "";
    (typeof o[d] != "object" || o[d] === null) && (o[d] = m ? [] : {}), o = o[d];
  }
  const p = c.shift();
  p === "" && Array.isArray(o) ? o.push(s) : o[p] = s;
}
function bb(l) {
  const i = [], s = l.split("[")[0];
  s && i.push(s);
  let c;
  const o = /\[([^\]]*)\]/g;
  for (; (c = o.exec(l)) !== null; )
    i.push(c[1]);
  return i;
}
function Af(l, i, s, c) {
  if (l !== void 0) {
    if (l === null) {
      s.push(`${i}=`);
      return;
    }
    if (Array.isArray(l)) {
      l.forEach((o, p) => {
        const d = c === "indices" ? `${i}[${p}]` : `${i}[]`;
        Af(o, d, s, c);
      });
      return;
    }
    if (typeof l == "object") {
      Object.keys(l).forEach((o) => {
        Af(l[o], i ? `${i}[${o}]` : o, s, c);
      });
      return;
    }
    s.push(`${i}=${encodeURIComponent(String(l))}`);
  }
}
function tn(l) {
  return new URL(l.toString(), typeof window > "u" ? void 0 : window.location.toString());
}
var Eb = (l, i, s, c, o) => {
  let p = typeof l == "string" ? tn(l) : l;
  if ((Ef(i) || c) && !wf(i) && (Yi.get("form.forceIndicesArrayFormatInFormData") && (o = "indices"), i = Ty(i, new FormData(), null, o)), wf(i))
    return [p, i];
  const [d, m] = Ls(s, p, i, o);
  return [tn(d), m];
};
function Ls(l, i, s, c = "brackets") {
  const o = l === "get" && !wf(s) && Object.keys(s).length > 0, p = qy(i.toString()), d = p || i.toString().startsWith("/") || i.toString() === "", m = !d && !i.toString().startsWith("#") && !i.toString().startsWith("?"), g = /^[.]{1,2}([/]|$)/.test(i.toString()), S = i.toString().includes("?") || o, A = i.toString().includes("#"), w = new URL(i.toString(), typeof window > "u" ? "http://localhost" : window.location.toString());
  if (o) {
    const N = pb(w) ? "indices" : c;
    w.search = gb({ ...yb(w.search), ...s }, N);
  }
  return [
    [
      p ? `${w.protocol}//${w.host}` : "",
      d ? w.pathname : "",
      m ? w.pathname.substring(g ? 0 : 1) : "",
      S ? w.search : "",
      A ? w.hash : ""
    ].join(""),
    o ? {} : s
  ];
}
function Ns(l) {
  return l = new URL(l.href), l.hash = "", l;
}
var ap = (l, i) => {
  l.hash && !i.hash && Ns(l).href === i.href && (i.hash = l.hash);
}, xs = (l, i) => Ns(l).href === Ns(i).href, wb = (l, i) => l.origin === i.origin && l.pathname === i.pathname;
function un(l) {
  return l !== null && typeof l == "object" && l !== void 0 && "url" in l && "method" in l;
}
function xy(l) {
  return l.component ? typeof l.component != "string" ? (console.error(
    `The "component" property on the URL method pair received multiple components (${Object.keys(l.component).join(", ")}), but only a single component string is supported for instant visits. Use the withComponent() method to specify which component to use.`
  ), null) : l.component : null;
}
function qy(l) {
  return /^([a-z][a-z0-9+.-]*:)?\/\/[^/]/i.test(l);
}
function Ab(l, i) {
  const s = typeof l == "string" ? tn(l) : l;
  return i ? `${s.protocol}//${s.host}${s.pathname}${s.search}${s.hash}` : `${s.pathname}${s.search}${s.hash}`;
}
var Ob = class {
  page;
  swapComponent;
  resolveComponent;
  onFlashCallback;
  componentId = {};
  listeners = [];
  isFirstPageLoad = !0;
  cleared = !1;
  pendingDeferredProps = null;
  historyQuotaExceeded = !1;
  optimisticBaseline = {};
  pendingOptimistics = [];
  optimisticCounter = 0;
  init({
    initialPage: l,
    swapComponent: i,
    resolveComponent: s,
    onFlash: c
  }) {
    return this.page = { ...l, flash: l.flash ?? {} }, this.swapComponent = i, this.resolveComponent = s, this.onFlashCallback = c, yn.on("historyQuotaExceeded", () => {
      this.historyQuotaExceeded = !0;
    }), this;
  }
  set(l, {
    replace: i = !1,
    preserveScroll: s = !1,
    preserveState: c = !1,
    viewTransition: o = !1
  } = {}) {
    Object.keys(l.deferredProps || {}).length && (this.pendingDeferredProps = {
      deferredProps: l.deferredProps,
      component: l.component,
      url: l.url
    }, l.initialDeferredProps === void 0 && (l.initialDeferredProps = l.deferredProps)), this.componentId = {};
    const p = this.componentId;
    return l.clearHistory && Se.clear(), this.resolve(l.component, l).then((d) => {
      if (p !== this.componentId)
        return;
      l.rememberedState ??= {};
      const m = typeof window > "u", g = m ? new URL(l.url) : window.location, S = !m && s ? Tt.getScrollRegions() : [];
      i = i || xs(tn(l.url), g);
      const A = { ...l, flash: {} };
      return new Promise(
        (w) => i ? Se.replaceState(A, w) : Se.pushState(A, w)
      ).then(() => {
        const w = !this.isTheSame(l);
        if (!w && Object.keys(l.props.errors || {}).length > 0 && (o = !1), this.page = l, this.cleared = !1, this.hasOnceProps() && pn.updateCachedOncePropsFromCurrentPage(), w && this.fireEventsFor("newComponent"), this.isFirstPageLoad && this.fireEventsFor("firstLoad"), this.isFirstPageLoad = !1, this.historyQuotaExceeded) {
          this.historyQuotaExceeded = !1;
          return;
        }
        return this.swap({
          component: d,
          page: l,
          preserveState: c,
          viewTransition: o
        }).then(() => {
          s ? window.requestAnimationFrame(() => Tt.restoreScrollRegions(S)) : Tt.reset(), this.pendingDeferredProps && this.pendingDeferredProps.component === l.component && this.pendingDeferredProps.url === l.url && yn.fireInternalEvent("loadDeferredProps", this.pendingDeferredProps.deferredProps), this.pendingDeferredProps = null, i || Ts(l);
        });
      });
    });
  }
  setQuietly(l, {
    preserveState: i = !1
  } = {}) {
    return this.resolve(l.component, l).then((s) => (this.page = l, this.cleared = !1, Se.setCurrent(l), this.swap({ component: s, page: l, preserveState: i, viewTransition: !1 })));
  }
  clear() {
    this.cleared = !0;
  }
  isCleared() {
    return this.cleared;
  }
  get() {
    return this.page;
  }
  getWithoutFlashData() {
    return { ...this.page, flash: {} };
  }
  hasOnceProps() {
    return Object.keys(this.page.onceProps ?? {}).length > 0;
  }
  merge(l) {
    this.page = { ...this.page, ...l };
  }
  setPropsQuietly(l) {
    return this.page = { ...this.page, props: l }, this.resolve(this.page.component, this.page).then((i) => this.swap({ component: i, page: this.page, preserveState: !0, viewTransition: !1 }));
  }
  setFlash(l) {
    this.page = { ...this.page, flash: l }, this.onFlashCallback?.(l);
  }
  setUrlHash(l) {
    this.page.url.includes(l) || (this.page.url += l);
  }
  remember(l) {
    this.page.rememberedState = l;
  }
  swap({
    component: l,
    page: i,
    preserveState: s,
    viewTransition: c
  }) {
    const o = () => this.swapComponent({ component: l, page: i, preserveState: s });
    if (!c || !document?.startViewTransition || document.visibilityState === "hidden")
      return o();
    const p = typeof c == "boolean" ? () => null : c;
    return new Promise((d) => {
      const m = document.startViewTransition(() => o().then(d));
      p(m);
    });
  }
  resolve(l, i) {
    return Promise.resolve(this.resolveComponent(l, i));
  }
  nextOptimisticId() {
    return ++this.optimisticCounter;
  }
  setBaseline(l, i) {
    l in this.optimisticBaseline || (this.optimisticBaseline[l] = i);
  }
  updateBaseline(l, i) {
    l in this.optimisticBaseline && (this.optimisticBaseline[l] = i);
  }
  hasBaseline(l) {
    return l in this.optimisticBaseline;
  }
  registerOptimistic(l, i) {
    this.pendingOptimistics.push({ id: l, callback: i });
  }
  unregisterOptimistic(l) {
    this.pendingOptimistics = this.pendingOptimistics.filter((i) => i.id !== l);
  }
  replayOptimistics() {
    const l = Object.keys(this.optimisticBaseline);
    if (l.length === 0)
      return {};
    const i = sn(this.page.props);
    for (const c of l)
      i[c] = sn(this.optimisticBaseline[c]);
    for (const { callback: c } of this.pendingOptimistics) {
      const o = c(sn(i));
      o && Object.assign(i, o);
    }
    const s = {};
    for (const c of l)
      s[c] = i[c];
    return s;
  }
  pendingOptimisticCount() {
    return this.pendingOptimistics.length;
  }
  clearOptimisticState() {
    this.optimisticBaseline = {}, this.pendingOptimistics = [];
  }
  isTheSame(l) {
    return this.page.component === l.component;
  }
  on(l, i) {
    return this.listeners.push({ event: l, callback: i }), () => {
      this.listeners = this.listeners.filter((s) => s.event !== l && s.callback !== i);
    };
  }
  fireEventsFor(l) {
    this.listeners.filter((i) => i.event === l).forEach((i) => i.callback());
  }
  mergeOncePropsIntoResponse(l, { force: i = !1 } = {}) {
    Object.entries(l.onceProps ?? {}).forEach(([s, c]) => {
      const o = this.page.onceProps?.[s];
      o !== void 0 && (i || mt(l.props, c.prop) === void 0) && (_n(l.props, c.prop, mt(this.page.props, o.prop)), l.onceProps[s].expiresAt = o.expiresAt);
    });
  }
}, q = new Ob(), Xs = class {
  items = [];
  processingPromise = null;
  add(l) {
    return this.items.push(l), this.process();
  }
  process() {
    return this.processingPromise ??= this.processNext().finally(() => {
      this.processingPromise = null;
    }), this.processingPromise;
  }
  processNext() {
    const l = this.items.shift();
    return l ? Promise.resolve(l()).then(() => this.processNext()) : Promise.resolve();
  }
}, Aa = typeof window > "u", Oi = new Xs(), ip = !Aa && /CriOS/.test(window.navigator.userAgent), Rb = class {
  rememberedState = "rememberedState";
  scrollRegions = "scrollRegions";
  preserveUrl = !1;
  current = {};
  // We need initialState for `restore`
  initialState = null;
  remember(l, i) {
    this.replaceState({
      ...q.getWithoutFlashData(),
      rememberedState: {
        ...q.get()?.rememberedState ?? {},
        [i]: l
      }
    });
  }
  restore(l) {
    if (!Aa)
      return this.current[this.rememberedState]?.[l] !== void 0 ? this.current[this.rememberedState]?.[l] : this.initialState?.[this.rememberedState]?.[l];
  }
  pushState(l, i = null) {
    if (!Aa) {
      if (this.preserveUrl) {
        i && i();
        return;
      }
      this.current = l, Oi.add(() => this.getPageData(l).then((s) => {
        const c = () => this.doPushState({ page: s }, l.url).then(() => i?.());
        return ip ? new Promise((o) => {
          setTimeout(() => c().then(o));
        }) : c();
      }));
    }
  }
  clonePageProps(l) {
    try {
      return structuredClone(l.props), l;
    } catch {
      return {
        ...l,
        props: sn(l.props)
      };
    }
  }
  getPageData(l) {
    const i = this.clonePageProps(l);
    return new Promise((s) => l.encryptHistory ? lb(i).then(s) : s(i));
  }
  processQueue() {
    return Oi.process();
  }
  decrypt(l = null) {
    if (Aa)
      return Promise.resolve(l ?? q.get());
    const i = l ?? window.history.state?.page;
    return this.decryptPageData(i).then((s) => {
      if (!s)
        throw new Error("Unable to decrypt history");
      return this.initialState === null ? this.initialState = s ?? void 0 : this.current = s ?? {}, s;
    });
  }
  decryptPageData(l) {
    return l instanceof ArrayBuffer ? ab(l) : Promise.resolve(l);
  }
  saveScrollPositions(l) {
    Oi.add(() => Promise.resolve().then(() => {
      if (window.history.state?.page && !Hi(this.getScrollRegions(), l))
        return this.doReplaceState({
          page: window.history.state.page,
          scrollRegions: l
        });
    }));
  }
  saveDocumentScrollPosition(l) {
    Oi.add(() => Promise.resolve().then(() => {
      if (window.history.state?.page && !Hi(this.getDocumentScrollPosition(), l))
        return this.doReplaceState({
          page: window.history.state.page,
          documentScrollPosition: l
        });
    }));
  }
  getScrollRegions() {
    return window.history.state?.scrollRegions || [];
  }
  getDocumentScrollPosition() {
    return window.history.state?.documentScrollPosition || { top: 0, left: 0 };
  }
  replaceState(l, i = null) {
    if (Hi(this.current, l)) {
      i && i();
      return;
    }
    const { flash: s, ...c } = l;
    if (q.merge(c), !Aa) {
      if (this.preserveUrl) {
        i && i();
        return;
      }
      this.current = l, Oi.add(() => this.getPageData(l).then((o) => {
        const p = () => this.doReplaceState({ page: o }, l.url).then(() => i?.());
        return ip ? new Promise((d) => {
          setTimeout(() => p().then(d));
        }) : p();
      }));
    }
  }
  isHistoryThrottleError(l) {
    return l instanceof Error && l.name === "SecurityError" && (l.message.includes("history.pushState") || l.message.includes("history.replaceState"));
  }
  isQuotaExceededError(l) {
    return l instanceof Error && l.name === "QuotaExceededError";
  }
  withThrottleProtection(l) {
    return Promise.resolve().then(() => {
      try {
        return l();
      } catch (i) {
        if (!this.isHistoryThrottleError(i))
          throw i;
        console.error(i.message);
      }
    });
  }
  doReplaceState(l, i) {
    return this.withThrottleProtection(() => {
      window.history.replaceState(
        {
          ...l,
          scrollRegions: l.scrollRegions ?? window.history.state?.scrollRegions,
          documentScrollPosition: l.documentScrollPosition ?? window.history.state?.documentScrollPosition
        },
        "",
        i
      );
    });
  }
  doPushState(l, i) {
    return this.withThrottleProtection(() => {
      try {
        window.history.pushState(l, "", i);
      } catch (s) {
        if (!this.isQuotaExceededError(s))
          throw s;
        yn.fireInternalEvent("historyQuotaExceeded", i);
      }
    });
  }
  getState(l, i) {
    return this.current?.[l] ?? i;
  }
  deleteState(l) {
    this.current[l] !== void 0 && (delete this.current[l], this.replaceState(this.current));
  }
  clearInitialState(l) {
    this.initialState && this.initialState[l] !== void 0 && delete this.initialState[l];
  }
  browserHasHistoryEntry() {
    return !Aa && !!window.history.state?.page;
  }
  clear() {
    Mt.remove(Da.key), Mt.remove(Da.iv);
  }
  setCurrent(l) {
    this.current = l;
  }
  isValidState(l) {
    return !!l.page;
  }
  getAllState() {
    return this.current;
  }
};
typeof window < "u" && window.history.scrollRestoration && (window.history.scrollRestoration = "manual");
var Se = new Rb(), zb = class {
  internalListeners = [];
  init() {
    typeof window < "u" && (window.addEventListener("popstate", this.handlePopstateEvent.bind(this)), window.addEventListener("pageshow", this.handlePageshowEvent.bind(this)), window.addEventListener("scroll", Ms(Tt.onWindowScroll.bind(Tt), 100), !0)), typeof document < "u" && document.addEventListener("scroll", Ms(Tt.onScroll.bind(Tt), 100), !0);
  }
  onGlobalEvent(l, i) {
    const s = ((c) => {
      const o = i(c);
      c.cancelable && !c.defaultPrevented && o === !1 && c.preventDefault();
    });
    return this.registerListener(`inertia:${l}`, s);
  }
  on(l, i) {
    return this.internalListeners.push({ event: l, listener: i }), () => {
      this.internalListeners = this.internalListeners.filter((s) => s.listener !== i);
    };
  }
  onMissingHistoryItem() {
    q.clear(), this.fireInternalEvent("missingHistoryItem");
  }
  fireInternalEvent(l, ...i) {
    this.internalListeners.filter((s) => s.event === l).forEach((s) => s.listener(...i));
  }
  registerListener(l, i) {
    return document.addEventListener(l, i), () => document.removeEventListener(l, i);
  }
  // bfcache restores pages without firing `popstate`, so we use `pageshow` to
  // re-validate encrypted history entries after `clearHistory` removed the keys.
  // https://web.dev/articles/bfcache
  handlePageshowEvent(l) {
    l.persisted && Se.decrypt().catch(() => this.onMissingHistoryItem());
  }
  handlePopstateEvent(l) {
    const i = l.state || null;
    if (i === null) {
      const s = tn(q.get().url);
      s.hash = window.location.hash, Se.replaceState({ ...q.getWithoutFlashData(), url: s.href }), Tt.reset();
      return;
    }
    if (!Se.isValidState(i))
      return this.onMissingHistoryItem();
    Se.decrypt(i.page).then((s) => {
      if (q.get().version !== s.version) {
        this.onMissingHistoryItem();
        return;
      }
      Ze.cancelAll({ prefetch: !1 }), q.setQuietly(s, { preserveState: !1 }).then(() => {
        Tt.restore(Se.getScrollRegions()), Ts(q.get());
        const c = {}, o = q.get().props;
        for (const [p, d] of Object.entries(s.initialDeferredProps ?? s.deferredProps ?? {})) {
          const m = d.filter((g) => mt(o, g) === void 0);
          m.length > 0 && (c[p] = m);
        }
        Object.keys(c).length > 0 && this.fireInternalEvent("loadDeferredProps", c);
      });
    }).catch(() => {
      this.onMissingHistoryItem();
    });
  }
}, yn = new zb(), Db = class {
  type;
  constructor() {
    this.type = this.resolveType();
  }
  resolveType() {
    return typeof window > "u" ? "navigate" : window.performance?.getEntriesByType("navigation")[0]?.type ?? "navigate";
  }
  get() {
    return this.type;
  }
  isBackForward() {
    return this.type === "back_forward";
  }
  isReload() {
    return this.type === "reload";
  }
}, nf = new Db(), Mb = class {
  static handle() {
    this.clearRememberedStateOnReload(), [this.handleBackForward, this.handleLocation, this.handleDefault].find((i) => i.bind(this)());
  }
  static clearRememberedStateOnReload() {
    nf.isReload() && (Se.deleteState(Se.rememberedState), Se.clearInitialState(Se.rememberedState));
  }
  static handleBackForward() {
    if (!nf.isBackForward() || !Se.browserHasHistoryEntry())
      return !1;
    const l = Se.getScrollRegions();
    return Se.decrypt().then((i) => {
      q.set(i, { preserveScroll: !0, preserveState: !0 }).then(() => {
        Tt.restore(l), Ts(q.get());
      });
    }).catch(() => {
      yn.onMissingHistoryItem();
    }), !0;
  }
  /**
   * @link https://inertiajs.com/redirects#external-redirects
   */
  static handleLocation() {
    if (!Mt.exists(Mt.locationVisitKey))
      return !1;
    const l = Mt.get(Mt.locationVisitKey) || {};
    return Mt.remove(Mt.locationVisitKey), typeof window < "u" && q.setUrlHash(window.location.hash), Se.decrypt(q.get()).then(() => {
      const i = Se.getState(Se.rememberedState, {}), s = Se.getScrollRegions();
      q.remember(i), q.set(q.get(), {
        preserveScroll: l.preserveScroll,
        preserveState: !0
      }).then(() => {
        l.preserveScroll && Tt.restore(s), this.fireInitialEvents();
      });
    }).catch(() => {
      yn.onMissingHistoryItem();
    }), !0;
  }
  static handleDefault() {
    typeof window < "u" && q.setUrlHash(window.location.hash), q.set(q.get(), { preserveScroll: !0, preserveState: !0 }).then(() => {
      nf.isReload() ? Tt.restore(Se.getScrollRegions()) : Tt.scrollToAnchor(), this.fireInitialEvents();
    });
  }
  static fireInitialEvents() {
    const l = q.get();
    Ts(l), Object.keys(l.flash).length > 0 && queueMicrotask(() => Us(l.flash));
  }
}, Tb = class {
  id = null;
  throttle = !1;
  keepAlive = !1;
  cb;
  interval;
  cbCount = 0;
  constructor(l, i, s) {
    this.keepAlive = s.keepAlive ?? !1, this.cb = i, this.interval = l, (s.autoStart ?? !0) && this.start();
  }
  stop() {
    this.id && clearInterval(this.id);
  }
  start() {
    typeof window > "u" || (this.stop(), this.id = window.setInterval(() => {
      (!this.throttle || this.cbCount % 10 === 0) && this.cb(), this.throttle && this.cbCount++;
    }, this.interval));
  }
  isInBackground(l) {
    this.throttle = this.keepAlive ? !1 : l, this.throttle && (this.cbCount = 0);
  }
}, Ub = class {
  polls = [];
  constructor() {
    this.setupVisibilityListener();
  }
  add(l, i, s) {
    const c = new Tb(l, i, s);
    return this.polls.push(c), {
      stop: () => c.stop(),
      start: () => c.start()
    };
  }
  clear() {
    this.polls.forEach((l) => l.stop()), this.polls = [];
  }
  setupVisibilityListener() {
    typeof document > "u" || document.addEventListener(
      "visibilitychange",
      () => {
        this.polls.forEach((l) => l.isInBackground(document.hidden));
      },
      !1
    );
  }
}, Nb = new Ub(), xb = class {
  requestHandlers = [];
  responseHandlers = [];
  errorHandlers = [];
  onRequest(l) {
    return this.requestHandlers.push(l), () => {
      this.requestHandlers = this.requestHandlers.filter((i) => i !== l);
    };
  }
  onResponse(l) {
    return this.responseHandlers.push(l), () => {
      this.responseHandlers = this.responseHandlers.filter((i) => i !== l);
    };
  }
  onError(l) {
    return this.errorHandlers.push(l), () => {
      this.errorHandlers = this.errorHandlers.filter((i) => i !== l);
    };
  }
  async processRequest(l) {
    let i = l;
    for (const s of this.requestHandlers)
      i = await s(i);
    return i;
  }
  async processResponse(l) {
    let i = l;
    for (const s of this.responseHandlers)
      i = await s(i);
    return i;
  }
  async processError(l) {
    for (const i of this.errorHandlers)
      await i(l);
  }
}, yt = new xb(), Yf = class extends Error {
  code;
  url;
  constructor(l, i, s) {
    super(s ? `${l} (${s})` : l), this.name = "HttpError", this.code = i, this.url = s;
  }
}, Of = class extends Yf {
  response;
  constructor(l, i, s) {
    super(l, "ERR_HTTP_RESPONSE", s), this.name = "HttpResponseError", this.response = i;
  }
}, Rf = class extends Yf {
  constructor(l = "Request was cancelled", i) {
    super(l, "ERR_CANCELLED", i), this.name = "HttpCancelledError";
  }
}, rp = class extends Yf {
  cause;
  constructor(l, i, s) {
    super(l, "ERR_NETWORK", i), this.name = "HttpNetworkError", this.cause = s;
  }
};
function qb(l) {
  const i = document.cookie.match(new RegExp("(^|;\\s*)(" + l + ")=([^;]*)"));
  return i ? decodeURIComponent(i[3]) : null;
}
function jb(l) {
  const i = {};
  return l.getAllResponseHeaders().split(`\r
`).forEach((s) => {
    const c = s.indexOf(":");
    c > 0 && (i[s.slice(0, c).toLowerCase().trim()] = s.slice(c + 1).trim());
  }), i;
}
function Hb(l, i) {
  if (!i.headers)
    return;
  const s = i.data instanceof FormData;
  Object.entries(i.headers).forEach(([c, o]) => {
    (c.toLowerCase() !== "content-type" || !s) && l.setRequestHeader(c, String(o));
  });
}
function Bb(l, i) {
  if (!i || Object.keys(i).length === 0)
    return l;
  const [s] = Ls("get", l, i);
  return s;
}
var jy = class {
  xsrfCookieName;
  xsrfHeaderName;
  constructor(l = {}) {
    this.xsrfCookieName = l.xsrfCookieName ?? "XSRF-TOKEN", this.xsrfHeaderName = l.xsrfHeaderName ?? "X-XSRF-TOKEN";
  }
  async request(l) {
    const i = await yt.processRequest(l);
    try {
      const s = await this.doRequest(i);
      return await yt.processResponse(s);
    } catch (s) {
      throw (s instanceof Of || s instanceof rp || s instanceof Rf) && await yt.processError(s), s;
    }
  }
  doRequest(l) {
    return new Promise((i, s) => {
      const c = new XMLHttpRequest(), o = Bb(l.url, l.params);
      c.open(l.method.toUpperCase(), o, !0);
      const p = qb(this.xsrfCookieName);
      p && c.setRequestHeader(this.xsrfHeaderName, p);
      let d = null;
      l.data !== null && l.data !== void 0 && (l.data instanceof FormData ? d = l.data : typeof l.data == "object" ? (d = JSON.stringify(l.data), !l.headers?.["Content-Type"] && !l.headers?.["content-type"] && c.setRequestHeader("Content-Type", "application/json")) : d = String(l.data)), Hb(c, l), l.onUploadProgress && (c.upload.onprogress = (m) => {
        const g = m.lengthComputable ? m.loaded / m.total : void 0;
        l.onUploadProgress({
          progress: g,
          percentage: g ? Math.round(g * 100) : 0,
          loaded: m.loaded,
          total: m.lengthComputable ? m.total : void 0
        });
      }), l.signal && l.signal.addEventListener("abort", () => c.abort()), c.onabort = () => s(new Rf("Request was cancelled", l.url)), c.onerror = () => s(new rp("Network error", l.url)), c.onload = () => {
        const m = {
          status: c.status,
          data: c.responseText,
          headers: jb(c)
        };
        c.status >= 400 ? s(new Of(`Request failed with status ${c.status}`, m, l.url)) : i(m);
      }, c.send(d);
    });
  }
}, _b = new jy(), lf = _b;
function Cb(l) {
  return !("request" in l);
}
var Hy = {
  /**
   * Get the current HTTP client
   */
  getClient() {
    return lf;
  },
  /**
   * Set the HTTP client to use for all Inertia requests
   */
  setClient(l) {
    if (!Cb(l)) {
      lf = l;
      return;
    }
    lf = new jy(l), l.xsrfCookieName && gt.withXsrfCookieName(l.xsrfCookieName), l.xsrfHeaderName && gt.withXsrfHeaderName(l.xsrfHeaderName);
  },
  /**
   * Register a request handler that runs before each request
   */
  onRequest: yt.onRequest.bind(yt),
  /**
   * Register a response handler that runs after each successful response
   */
  onResponse: yt.onResponse.bind(yt),
  /**
   * Register an error handler that runs when a request fails
   */
  onError: yt.onError.bind(yt),
  /**
   * Process a request config through all registered request handlers.
   * For use by custom HttpClient implementations.
   */
  processRequest: yt.processRequest.bind(yt),
  /**
   * Process a response through all registered response handlers.
   * For use by custom HttpClient implementations.
   */
  processResponse: yt.processResponse.bind(yt),
  /**
   * Process an error through all registered error handlers.
   * For use by custom HttpClient implementations.
   */
  processError: yt.processError.bind(yt)
}, ms = class ps {
  callbacks = [];
  params;
  constructor(i) {
    if (!i.prefetch)
      this.params = i;
    else {
      const s = {
        onBefore: this.wrapCallback(i, "onBefore"),
        onBeforeUpdate: this.wrapCallback(i, "onBeforeUpdate"),
        onStart: this.wrapCallback(i, "onStart"),
        onProgress: this.wrapCallback(i, "onProgress"),
        onFinish: this.wrapCallback(i, "onFinish"),
        onCancel: this.wrapCallback(i, "onCancel"),
        onSuccess: this.wrapCallback(i, "onSuccess"),
        onError: this.wrapCallback(i, "onError"),
        onHttpException: this.wrapCallback(i, "onHttpException"),
        onNetworkError: this.wrapCallback(i, "onNetworkError"),
        onFlash: this.wrapCallback(i, "onFlash"),
        onCancelToken: this.wrapCallback(i, "onCancelToken"),
        onPrefetched: this.wrapCallback(i, "onPrefetched"),
        onPrefetching: this.wrapCallback(i, "onPrefetching")
      };
      this.params = {
        ...i,
        ...s,
        onPrefetchResponse: i.onPrefetchResponse || (() => {
        }),
        onPrefetchError: i.onPrefetchError || (() => {
        })
      };
    }
  }
  static create(i) {
    return new ps(i);
  }
  data() {
    return this.params.method === "get" ? null : this.params.data;
  }
  queryParams() {
    return this.params.method === "get" ? this.params.data : {};
  }
  isPartial() {
    return this.params.only.length > 0 || this.params.except.length > 0 || this.params.reset.length > 0;
  }
  isPrefetch() {
    return this.params.prefetch === !0;
  }
  isDeferredPropsRequest() {
    return this.params.deferredProps === !0;
  }
  onCancelToken(i) {
    this.params.onCancelToken({
      cancel: i
    });
  }
  markAsFinished() {
    this.params.completed = !0, this.params.cancelled = !1, this.params.interrupted = !1;
  }
  markAsCancelled({ cancelled: i = !0, interrupted: s = !1 }) {
    this.params.onCancel(), this.params.completed = !1, this.params.cancelled = i, this.params.interrupted = s;
  }
  wasCancelledAtAll() {
    return this.params.cancelled || this.params.interrupted;
  }
  onFinish() {
    this.params.onFinish(this.params);
  }
  onStart() {
    this.params.onStart(this.params);
  }
  onPrefetching() {
    this.params.onPrefetching(this.params);
  }
  onPrefetchResponse(i) {
    this.params.onPrefetchResponse && this.params.onPrefetchResponse(i);
  }
  onPrefetchError(i) {
    this.params.onPrefetchError && this.params.onPrefetchError(i);
  }
  all() {
    return this.params;
  }
  headers() {
    const i = {
      ...this.params.headers
    };
    this.isPartial() && (i["X-Inertia-Partial-Component"] = q.get().component);
    const s = this.params.only.concat(this.params.reset);
    return s.length > 0 && (i["X-Inertia-Partial-Data"] = s.join(",")), this.params.except.length > 0 && (i["X-Inertia-Partial-Except"] = this.params.except.join(",")), this.params.reset.length > 0 && (i["X-Inertia-Reset"] = this.params.reset.join(",")), this.params.errorBag && this.params.errorBag.length > 0 && (i["X-Inertia-Error-Bag"] = this.params.errorBag), i;
  }
  setPreserveOptions(i) {
    this.params.preserveScroll = ps.resolvePreserveOption(this.params.preserveScroll, i), this.params.preserveState = ps.resolvePreserveOption(this.params.preserveState, i);
  }
  runCallbacks() {
    this.callbacks.forEach(({ name: i, args: s }) => {
      this.params[i](...s);
    });
  }
  merge(i) {
    this.params = {
      ...this.params,
      ...i
    };
  }
  wrapCallback(i, s) {
    return (...c) => {
      this.recordCallback(s, c), i[s](...c);
    };
  }
  recordCallback(i, s) {
    this.callbacks.push({ name: i, args: s });
  }
  static resolvePreserveOption(i, s) {
    return typeof i == "function" ? i(s) : i === "errors" ? Object.keys(s.props.errors || {}).length > 0 : i;
  }
}, Lb = {
  createIframeAndPage(l) {
    typeof l == "object" && (l = `All Inertia requests must receive a valid Inertia response, however a plain JSON response was received.<hr>${JSON.stringify(
      l
    )}`);
    const i = document.createElement("html");
    i.innerHTML = l, i.querySelectorAll("a").forEach((c) => c.setAttribute("target", "_top"));
    const s = document.createElement("iframe");
    return s.style.backgroundColor = "white", s.style.borderRadius = "5px", s.style.width = "100%", s.style.height = "100%", { iframe: s, page: i };
  },
  show(l) {
    const { iframe: i, page: s } = this.createIframeAndPage(l);
    i.style.boxSizing = "border-box", i.style.display = "block";
    const c = document.createElement("dialog");
    c.id = "inertia-error-dialog", Object.assign(c.style, {
      width: "calc(100vw - 100px)",
      height: "calc(100vh - 100px)",
      padding: "0",
      margin: "auto",
      border: "none",
      backgroundColor: "transparent"
    });
    const o = document.createElement("style");
    if (o.textContent = `
      dialog#inertia-error-dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.6);
      }

      dialog#inertia-error-dialog:focus {
        outline: none;
      }
    `, document.head.appendChild(o), c.addEventListener("click", (p) => {
      p.target === c && c.close();
    }), c.addEventListener("close", () => {
      o.remove(), c.remove();
    }), c.appendChild(i), document.body.prepend(c), c.showModal(), c.focus(), !i.contentWindow)
      throw new Error("iframe not yet ready.");
    i.contentWindow.document.open(), i.contentWindow.document.write(s.outerHTML), i.contentWindow.document.close();
  }
}, Xb = new Xs(), sp = class By {
  constructor(i, s, c) {
    this.requestParams = i, this.response = s, this.originatingPage = c;
  }
  wasPrefetched = !1;
  processed = !1;
  static create(i, s, c) {
    return new By(i, s, c);
  }
  isProcessed() {
    return this.processed;
  }
  async handlePrefetch() {
    xs(this.requestParams.all().url, window.location) && this.handle();
  }
  async handle() {
    return Xb.add(() => this.process());
  }
  async process() {
    if (this.requestParams.all().prefetch)
      return this.wasPrefetched = !0, this.requestParams.all().prefetch = !1, this.requestParams.all().onPrefetched(this.response, this.requestParams.all()), tb(this.response, this.requestParams.all()), Promise.resolve();
    if (this.requestParams.runCallbacks(), this.processed = !0, !this.isInertiaResponse())
      return this.handleNonInertiaResponse();
    if (this.isHttpException()) {
      const c = {
        ...this.response,
        data: this.getDataFromResponse(this.response.data)
      };
      if (this.requestParams.all().onHttpException(c) === !1 || !tp(c))
        return;
    }
    await Se.processQueue(), Se.preserveUrl = this.requestParams.all().preserveUrl, await this.setPage();
    const { flash: i } = q.get();
    Object.keys(i).length > 0 && !this.requestParams.isDeferredPropsRequest() && (Us(i), this.requestParams.all().onFlash(i));
    const s = q.get().props.errors || {};
    if (Object.keys(s).length > 0) {
      const c = this.getScopedErrors(s);
      return JS(c), this.requestParams.all().onError(c);
    }
    Ze.flushByCacheTags(this.requestParams.all().invalidateCacheTags || []), this.wasPrefetched || Ze.flush(q.get().url), eb(q.get()), await this.requestParams.all().onSuccess(q.get()), Se.preserveUrl = !1;
  }
  mergeParams(i) {
    this.requestParams.merge(i);
  }
  getPageResponse() {
    const i = this.getDataFromResponse(this.response.data);
    return typeof i == "object" ? this.response.data = { ...i, flash: i.flash ?? {} } : this.response.data = i;
  }
  async handleNonInertiaResponse() {
    if (this.isInertiaRedirect()) {
      Ze.visit(this.getHeader("x-inertia-redirect"), {
        ...this.requestParams.all(),
        method: "get",
        data: {}
      });
      return;
    }
    if (this.isLocationVisit()) {
      const s = tn(this.getHeader("x-inertia-location"));
      return ap(this.requestParams.all().url, s), this.locationVisit(s);
    }
    const i = {
      ...this.response,
      data: this.getDataFromResponse(this.response.data)
    };
    if (this.requestParams.all().onHttpException(i) !== !1 && tp(i))
      return Lb.show(i.data);
  }
  isInertiaResponse() {
    return this.hasHeader("x-inertia");
  }
  isHttpException() {
    return this.response.status >= 400;
  }
  hasStatus(i) {
    return this.response.status === i;
  }
  getHeader(i) {
    return this.response.headers[i];
  }
  hasHeader(i) {
    return this.getHeader(i) !== void 0;
  }
  isInertiaRedirect() {
    return this.hasStatus(409) && this.hasHeader("x-inertia-redirect");
  }
  isLocationVisit() {
    return this.hasStatus(409) && this.hasHeader("x-inertia-location");
  }
  /**
   * @link https://inertiajs.com/redirects#external-redirects
   */
  locationVisit(i) {
    try {
      if (Mt.set(Mt.locationVisitKey, {
        preserveScroll: this.requestParams.all().preserveScroll === !0
      }), typeof window > "u")
        return;
      xs(window.location, i) ? window.location.reload() : window.location.href = i.href;
    } catch {
      return !1;
    }
  }
  async setPage() {
    const i = this.getPageResponse();
    return this.shouldSetPage(i) ? (this.mergeProps(i), q.mergeOncePropsIntoResponse(i), this.preserveOptimisticProps(i), this.preserveEqualProps(i), await this.setRememberedState(i), this.requestParams.setPreserveOptions(i), i.url = Se.preserveUrl ? q.get().url : this.pageUrl(i), this.requestParams.all().onBeforeUpdate(i), WS(i), q.set(i, {
      replace: this.requestParams.all().replace,
      preserveScroll: this.requestParams.all().preserveScroll,
      preserveState: this.requestParams.all().preserveState,
      viewTransition: this.requestParams.all().viewTransition
    })) : Promise.resolve();
  }
  getDataFromResponse(i) {
    if (typeof i != "string")
      return i;
    try {
      return JSON.parse(i);
    } catch {
      return i;
    }
  }
  shouldSetPage(i) {
    if (!this.requestParams.all().async || this.originatingPage.component !== i.component)
      return !0;
    if (this.originatingPage.component !== q.get().component)
      return !1;
    const s = tn(this.originatingPage.url), c = tn(q.get().url);
    return s.origin === c.origin && s.pathname === c.pathname;
  }
  pageUrl(i) {
    const s = tn(i.url);
    return i.preserveFragment ? s.hash = this.requestParams.all().url.hash : ap(this.requestParams.all().url, s), s.pathname + s.search + s.hash;
  }
  preserveOptimisticProps(i) {
    if (Ze.hasPendingOptimistic())
      for (const s of Object.keys(i.props))
        q.hasBaseline(s) && (q.updateBaseline(s, i.props[s]), i.props[s] = q.get().props[s]);
  }
  preserveEqualProps(i) {
    if (i.component !== q.get().component)
      return;
    const s = q.get().props;
    Object.entries(i.props).forEach(([c, o]) => {
      Hi(o, s[c]) && (i.props[c] = s[c]);
    });
  }
  mergeProps(i) {
    if (!this.requestParams.isPartial() || i.component !== q.get().component)
      return;
    const s = i.mergeProps || [], c = i.prependProps || [], o = i.deepMergeProps || [], p = i.matchPropsOn || [], d = (S, A) => {
      const w = mt(q.get().props, S), N = mt(i.props, S);
      if (Array.isArray(N)) {
        const _ = this.mergeOrMatchItems(
          w || [],
          N,
          S,
          p,
          A
        );
        _n(i.props, S, _);
      } else if (typeof N == "object" && N !== null) {
        const _ = {
          ...w || {},
          ...N
        };
        _n(i.props, S, _);
      }
    };
    s.forEach((S) => d(S, !0)), c.forEach((S) => d(S, !1)), o.forEach((S) => {
      const A = mt(q.get().props, S), w = mt(i.props, S), N = (_, B, Z) => Array.isArray(B) ? this.mergeOrMatchItems(_, B, Z, p) : typeof B == "object" && B !== null ? Object.keys(B).reduce(
        (oe, C) => (oe[C] = N(_ ? _[C] : void 0, B[C], `${Z}.${C}`), oe),
        { ..._ }
      ) : B;
      _n(i.props, S, N(A, w, S));
    });
    const m = new Set(
      [...this.requestParams.all().only, ...this.requestParams.all().except].filter((S) => S.includes(".")).map((S) => S.split(".")[0])
    );
    for (const S of m) {
      const A = q.get().props[S];
      this.isObject(A) && this.isObject(i.props[S]) && (i.props[S] = this.deepMergeObjects(A, i.props[S]));
    }
    i.props = { ...q.get().props, ...i.props }, this.shouldPreserveErrors(i) && (i.props.errors = q.get().props.errors), q.get().scrollProps && (i.scrollProps = {
      ...q.get().scrollProps || {},
      ...i.scrollProps || {}
    }), q.hasOnceProps() && (i.onceProps = {
      ...q.get().onceProps || {},
      ...i.onceProps || {}
    }), this.requestParams.isDeferredPropsRequest() && (i.flash = { ...q.get().flash });
    const g = q.get().initialDeferredProps;
    g && Object.keys(g).length > 0 && (i.initialDeferredProps = g);
  }
  /**
   * By default, the Laravel adapter shares validation errors via Inertia::always(),
   * so responses always include errors, even when empty. Components like
   * InfiniteScroll and WhenVisible, as well as loading deferred props,
   * perform async requests that should practically never reset errors.
   */
  shouldPreserveErrors(i) {
    if (!this.requestParams.all().preserveErrors)
      return !1;
    const s = q.get().props.errors;
    if (!s || Object.keys(s).length === 0)
      return !1;
    const c = i.props.errors;
    return !(c && Object.keys(c).length > 0);
  }
  isObject(i) {
    return i && typeof i == "object" && !Array.isArray(i);
  }
  deepMergeObjects(i, s) {
    const c = { ...i };
    for (const o of Object.keys(s)) {
      const p = i[o], d = s[o];
      this.isObject(p) && this.isObject(d) ? c[o] = this.deepMergeObjects(p, d) : c[o] = d;
    }
    return c;
  }
  mergeOrMatchItems(i, s, c, o, p = !0) {
    const d = Array.isArray(i) ? i : [], m = o.find((A) => A.split(".").slice(0, -1).join(".") === c);
    if (!m)
      return p ? [...d, ...s] : [...s, ...d];
    const g = m.split(".").pop() || "", S = /* @__PURE__ */ new Map();
    return s.forEach((A) => {
      this.hasUniqueProperty(A, g) && S.set(A[g], A);
    }), p ? this.appendWithMatching(d, s, S, g) : this.prependWithMatching(d, s, S, g);
  }
  appendWithMatching(i, s, c, o) {
    const p = i.map((m) => this.hasUniqueProperty(m, o) && c.has(m[o]) ? c.get(m[o]) : m), d = s.filter((m) => this.hasUniqueProperty(m, o) ? !i.some(
      (g) => this.hasUniqueProperty(g, o) && g[o] === m[o]
    ) : !0);
    return [...p, ...d];
  }
  prependWithMatching(i, s, c, o) {
    const p = i.filter((d) => this.hasUniqueProperty(d, o) ? !c.has(d[o]) : !0);
    return [...s, ...p];
  }
  hasUniqueProperty(i, s) {
    return i && typeof i == "object" && s in i;
  }
  async setRememberedState(i) {
    const s = await Se.getState(Se.rememberedState, {});
    this.requestParams.all().preserveState && s && i.component === q.get().component && (i.rememberedState = s);
  }
  getScopedErrors(i) {
    return this.requestParams.all().errorBag ? i[this.requestParams.all().errorBag || ""] || {} : i;
  }
}, up = class _y {
  constructor(i, s, { optimistic: c = !1 } = {}) {
    this.page = s, this.requestParams = ms.create(i), this.cancelToken = new AbortController(), this.optimistic = c;
  }
  response;
  cancelToken;
  requestParams;
  requestHasFinished = !1;
  optimistic;
  static create(i, s, c) {
    return new _y(i, s, c);
  }
  isPrefetch() {
    return this.requestParams.isPrefetch();
  }
  isOptimistic() {
    return this.optimistic;
  }
  isPendingOptimistic() {
    return this.isOptimistic() && (!this.response || !this.response.isProcessed());
  }
  async send() {
    this.requestParams.onCancelToken(() => this.cancel({ cancelled: !0 })), IS(this.requestParams.all()), this.requestParams.onStart(), this.requestParams.all().prefetch && (this.requestParams.onPrefetching(), nb(this.requestParams.all()));
    const i = this.requestParams.all().prefetch;
    return Hy.getClient().request({
      method: this.requestParams.all().method,
      url: Ns(this.requestParams.all().url).href,
      data: this.requestParams.data(),
      signal: this.cancelToken.signal,
      headers: this.getHeaders(),
      onUploadProgress: this.onProgress.bind(this)
    }).then((s) => (this.response = sp.create(this.requestParams, s, this.page), this.response.handle())).catch((s) => s instanceof Of ? (this.response = sp.create(this.requestParams, s.response, this.page), this.response.handle()) : Promise.reject(s)).catch((s) => {
      if (!(s instanceof Rf) && this.requestParams.all().onNetworkError(s) !== !1 && FS(s))
        return i && this.requestParams.onPrefetchError(s), Promise.reject(s);
    }).finally(() => {
      this.finish(), i && this.response && this.requestParams.onPrefetchResponse(this.response);
    });
  }
  finish() {
    this.requestParams.wasCancelledAtAll() || (this.requestParams.markAsFinished(), this.fireFinishEvents());
  }
  fireFinishEvents() {
    this.requestHasFinished || (this.requestHasFinished = !0, $S(this.requestParams.all()), this.requestParams.onFinish());
  }
  cancel({ cancelled: i = !1, interrupted: s = !1 }) {
    this.requestHasFinished || (this.cancelToken.abort(), this.requestParams.markAsCancelled({ cancelled: i, interrupted: s }), this.fireFinishEvents());
  }
  onProgress(i) {
    this.requestParams.data() instanceof FormData && (kS(i), this.requestParams.all().onProgress(i));
  }
  getHeaders() {
    const i = {
      ...this.requestParams.headers(),
      Accept: "text/html, application/xhtml+xml",
      "X-Requested-With": "XMLHttpRequest",
      "X-Inertia": !0
    }, s = q.get();
    s.version && (i["X-Inertia-Version"] = s.version);
    const c = Object.entries(s.onceProps || {}).filter(([, o]) => mt(s.props, o.prop) === void 0 ? !1 : !o.expiresAt || o.expiresAt > Date.now()).map(([o]) => o);
    return c.length > 0 && (i["X-Inertia-Except-Once-Props"] = c.join(",")), i;
  }
}, cp = class {
  requests = [];
  maxConcurrent;
  interruptible;
  constructor({ maxConcurrent: l, interruptible: i }) {
    this.maxConcurrent = l, this.interruptible = i;
  }
  send(l) {
    this.requests.push(l), l.send().finally(() => {
      this.requests = this.requests.filter((i) => i !== l);
    });
  }
  interruptInFlight() {
    this.cancel({ interrupted: !0 }, !1);
  }
  cancelInFlight({ prefetch: l = !0, optimistic: i = !0 } = {}) {
    this.requests.filter((s) => l || !s.isPrefetch()).filter((s) => i || !s.isOptimistic()).forEach((s) => s.cancel({ cancelled: !0 }));
  }
  cancel({ cancelled: l = !1, interrupted: i = !1 } = {}, s = !1) {
    if (!s && !this.shouldCancel())
      return;
    this.requests.shift()?.cancel({ cancelled: l, interrupted: i });
  }
  shouldCancel() {
    return this.interruptible && this.requests.length >= this.maxConcurrent;
  }
  hasPendingOptimistic() {
    return this.requests.some((l) => l.isPendingOptimistic());
  }
}, Dt = () => {
}, Yb = class {
  syncRequestStream = new cp({
    maxConcurrent: 1,
    interruptible: !0
  });
  asyncRequestStream = new cp({
    maxConcurrent: 1 / 0,
    interruptible: !1
  });
  clientVisitQueue = new Xs();
  pendingOptimisticCallback = void 0;
  init({
    initialPage: l,
    resolveComponent: i,
    swapComponent: s,
    onFlash: c
  }) {
    q.init({
      initialPage: l,
      resolveComponent: i,
      swapComponent: s,
      onFlash: c
    }), Mb.handle(), yn.init(), yn.on("missingHistoryItem", () => {
      typeof window < "u" && this.visit(window.location.href, { preserveState: !0, preserveScroll: !0, replace: !0 });
    }), yn.on("loadDeferredProps", (o) => {
      this.loadDeferredProps(o);
    }), yn.on("historyQuotaExceeded", (o) => {
      window.location.href = o;
    });
  }
  optimistic(l) {
    return this.pendingOptimisticCallback = l, this;
  }
  get(l, i = {}, s = {}) {
    return this.visit(l, { ...s, method: "get", data: i });
  }
  post(l, i = {}, s = {}) {
    return this.visit(l, { preserveState: !0, ...s, method: "post", data: i });
  }
  put(l, i = {}, s = {}) {
    return this.visit(l, { preserveState: !0, ...s, method: "put", data: i });
  }
  patch(l, i = {}, s = {}) {
    return this.visit(l, { preserveState: !0, ...s, method: "patch", data: i });
  }
  delete(l, i = {}) {
    return this.visit(l, { preserveState: !0, ...i, method: "delete" });
  }
  reload(l = {}) {
    return this.doReload(l);
  }
  doReload(l = {}) {
    if (!(typeof window > "u"))
      return this.visit(window.location.href, {
        ...l,
        preserveScroll: !0,
        preserveState: !0,
        async: !0,
        headers: {
          ...l.headers || {},
          "Cache-Control": "no-cache"
        }
      });
  }
  remember(l, i = "default") {
    Se.remember(l, i);
  }
  restore(l = "default") {
    return Se.restore(l);
  }
  on(l, i) {
    return typeof window > "u" ? () => {
    } : yn.onGlobalEvent(l, i);
  }
  hasPendingOptimistic() {
    return this.asyncRequestStream.hasPendingOptimistic();
  }
  cancelAll({ async: l = !0, prefetch: i = !0, sync: s = !0 } = {}) {
    l && this.asyncRequestStream.cancelInFlight({ prefetch: i }), s && this.syncRequestStream.cancelInFlight();
  }
  poll(l, i = {}, s = {}) {
    return Nb.add(l, () => this.reload({ preserveErrors: !0, ...i }), {
      autoStart: s.autoStart ?? !0,
      keepAlive: s.keepAlive ?? !1
    });
  }
  visit(l, i = {}) {
    i.optimistic = i.optimistic ?? this.pendingOptimisticCallback, this.pendingOptimisticCallback = void 0, i.optimistic && (i.async = i.async ?? !0);
    const s = this.getPendingVisit(l, {
      ...i,
      showProgress: i.showProgress ?? (!i.async || !!i.optimistic)
    }), c = this.getVisitEvents(i);
    if (c.onBefore(s) === !1 || !ep(s))
      return;
    const o = tn(q.get().url);
    (s.only.length > 0 || s.except.length > 0 || s.reset.length > 0 ? wb(s.url, o) : xs(s.url, o)) || this.asyncRequestStream.cancelInFlight({ prefetch: !1, optimistic: !1 }), s.async || this.syncRequestStream.interruptInFlight(), i.optimistic && this.applyOptimisticUpdate(i.optimistic, c), !q.isCleared() && !s.preserveUrl && Tt.save();
    const m = {
      ...s,
      ...c
    }, g = () => {
      const S = pn.get(m);
      S ? (rf.reveal(S.inFlight), pn.use(S, m)) : (rf.reveal(!0), (s.async ? this.asyncRequestStream : this.syncRequestStream).send(up.create(m, q.get(), { optimistic: !!i.optimistic })));
    };
    Array.isArray(s.component) && (console.error(
      `The "component" prop received an array of components (${s.component.join(", ")}), but only a single component string is supported for instant visits. Pass an explicit component name instead.`
    ), s.component = null), s.component ? Se.processQueue().then(() => {
      this.performInstantSwap(s).then(() => {
        m.preserveState = !0, m.replace = !0, m.viewTransition = !1, g();
      });
    }) : g();
  }
  getCached(l, i = {}) {
    return pn.findCached(this.getPrefetchParams(l, i));
  }
  flush(l, i = {}) {
    pn.remove(this.getPrefetchParams(l, i));
  }
  flushAll() {
    pn.removeAll();
  }
  flushByCacheTags(l) {
    pn.removeByTags(Array.isArray(l) ? l : [l]);
  }
  getPrefetching(l, i = {}) {
    return pn.findInFlight(this.getPrefetchParams(l, i));
  }
  prefetch(l, i = {}, s = {}) {
    if ((i.method ?? (un(l) ? l.method : "get")) !== "get")
      throw new Error("Prefetch requests must use the GET method");
    const o = this.getPendingVisit(l, {
      ...i,
      async: !0,
      showProgress: !1,
      prefetch: !0,
      viewTransition: !1
    }), p = o.url.origin + o.url.pathname + o.url.search, d = window.location.origin + window.location.pathname + window.location.search;
    if (p === d)
      return;
    const m = this.getVisitEvents(i);
    if (m.onBefore(o) === !1 || !ep(o))
      return;
    rf.hide(), this.asyncRequestStream.interruptInFlight();
    const g = {
      ...o,
      ...m
    };
    new Promise((A) => {
      const w = () => {
        q.get() ? A() : setTimeout(w, 50);
      };
      w();
    }).then(() => {
      pn.add(
        g,
        (A) => {
          this.asyncRequestStream.send(up.create(A, q.get()));
        },
        {
          cacheFor: Yi.get("prefetch.cacheFor"),
          cacheTags: [],
          ...s
        }
      );
    });
  }
  clearHistory() {
    Se.clear();
  }
  decryptHistory() {
    return Se.decrypt();
  }
  resolveComponent(l, i) {
    return q.resolve(l, i);
  }
  replace(l) {
    this.clientVisit(l, { replace: !0 });
  }
  replaceProp(l, i, s) {
    this.replace({
      preserveScroll: !0,
      preserveState: !0,
      props(c) {
        const o = typeof i == "function" ? i(mt(c, l), c) : i;
        return _n(sn(c), l, o);
      },
      ...s || {}
    });
  }
  appendToProp(l, i, s) {
    this.replaceProp(
      l,
      (c, o) => {
        const p = typeof i == "function" ? i(c, o) : i;
        return Array.isArray(c) || (c = c !== void 0 ? [c] : []), [...c, p];
      },
      s
    );
  }
  prependToProp(l, i, s) {
    this.replaceProp(
      l,
      (c, o) => {
        const p = typeof i == "function" ? i(c, o) : i;
        return Array.isArray(c) || (c = c !== void 0 ? [c] : []), [p, ...c];
      },
      s
    );
  }
  push(l) {
    this.clientVisit(l);
  }
  flash(l, i) {
    const s = q.get().flash;
    let c;
    if (typeof l == "function")
      c = l(s);
    else if (typeof l == "string")
      c = { ...s, [l]: i };
    else if (l && Object.keys(l).length)
      c = { ...s, ...l };
    else
      return;
    q.setFlash(c), Object.keys(c).length && Us(c);
  }
  clientVisit(l, { replace: i = !1 } = {}) {
    this.clientVisitQueue.add(() => this.performClientVisit(l, { replace: i }));
  }
  performClientVisit(l, { replace: i = !1 } = {}) {
    const s = q.get(), c = typeof l.props == "function" ? Object.fromEntries(
      Object.values(s.onceProps ?? {}).map((Z) => [
        Z.prop,
        mt(s.props, Z.prop)
      ])
    ) : {}, o = typeof l.props == "function" ? l.props(s.props, c) : l.props ?? s.props, p = typeof l.flash == "function" ? l.flash(s.flash) : l.flash, { viewTransition: d, onError: m, onFinish: g, onFlash: S, onSuccess: A, ...w } = l, N = {
      ...s,
      ...w,
      flash: p ?? {},
      props: o
    }, _ = ms.resolvePreserveOption(l.preserveScroll ?? !1, N), B = ms.resolvePreserveOption(l.preserveState ?? !1, N);
    return q.set(N, {
      replace: i,
      preserveScroll: _,
      preserveState: B,
      viewTransition: d
    }).then(() => {
      const Z = q.get().flash;
      Object.keys(Z).length > 0 && (Us(Z), S?.(Z));
      const oe = q.get().props.errors || {};
      if (Object.keys(oe).length === 0) {
        A?.(q.get());
        return;
      }
      const C = l.errorBag ? oe[l.errorBag || ""] || {} : oe;
      m?.(C);
    }).finally(() => g?.(l));
  }
  performInstantSwap(l) {
    const i = q.get(), s = Object.fromEntries(
      (i.sharedProps ?? []).filter((d) => d in i.props).map((d) => [d, i.props[d]])
    ), c = typeof l.pageProps == "function" ? l.pageProps(sn(i.props), sn(s)) : l.pageProps, o = c !== null ? { ...c } : { ...s }, p = {
      component: l.component,
      url: l.url.pathname + l.url.search + l.url.hash,
      version: i.version,
      props: {
        ...o,
        errors: {}
      },
      flash: {},
      clearHistory: !1,
      encryptHistory: i.encryptHistory,
      sharedProps: i.sharedProps,
      rememberedState: {}
    };
    return q.set(p, {
      replace: l.replace,
      preserveScroll: ms.resolvePreserveOption(l.preserveScroll, p),
      preserveState: !1,
      viewTransition: l.viewTransition
    });
  }
  getPrefetchParams(l, i) {
    return {
      ...this.getPendingVisit(l, {
        ...i,
        async: !0,
        showProgress: !1,
        prefetch: !0,
        viewTransition: !1
      }),
      ...this.getVisitEvents(i)
    };
  }
  getPendingVisit(l, i) {
    if (un(l)) {
      const g = l;
      l = g.url, i.method = i.method ?? g.method;
    }
    const s = Yi.get("visitOptions"), c = s ? s(l.toString(), sn(i)) || {} : {}, o = {
      method: "get",
      data: {},
      replace: !1,
      preserveScroll: !1,
      preserveState: !1,
      only: [],
      except: [],
      headers: {},
      errorBag: "",
      forceFormData: !1,
      queryStringArrayFormat: "brackets",
      async: !1,
      showProgress: !0,
      fresh: !1,
      reset: [],
      preserveUrl: !1,
      preserveErrors: !1,
      prefetch: !1,
      invalidateCacheTags: [],
      viewTransition: !1,
      component: null,
      pageProps: null,
      ...i,
      ...c
    }, [p, d] = Eb(
      l,
      o.data,
      o.method,
      o.forceFormData,
      o.queryStringArrayFormat
    ), m = {
      cancelled: !1,
      completed: !1,
      interrupted: !1,
      ...o,
      url: p,
      data: d
    };
    return m.prefetch && (m.headers.Purpose = "prefetch"), m;
  }
  getVisitEvents(l) {
    return {
      onCancelToken: l.onCancelToken || Dt,
      onBefore: l.onBefore || Dt,
      onBeforeUpdate: l.onBeforeUpdate || Dt,
      onStart: l.onStart || Dt,
      onProgress: l.onProgress || Dt,
      onFinish: l.onFinish || Dt,
      onCancel: l.onCancel || Dt,
      onSuccess: l.onSuccess || Dt,
      onError: l.onError || Dt,
      onHttpException: l.onHttpException || Dt,
      onNetworkError: l.onNetworkError || Dt,
      onFlash: l.onFlash || Dt,
      onPrefetched: l.onPrefetched || Dt,
      onPrefetching: l.onPrefetching || Dt
    };
  }
  applyOptimisticUpdate(l, i) {
    const s = q.get().props, c = l(sn(s));
    if (!c)
      return;
    const o = [];
    for (const A of Object.keys(c))
      Hi(s[A], c[A]) || o.push(A);
    if (o.length === 0)
      return;
    const p = q.nextOptimisticId(), d = q.get().component;
    for (const A of o)
      q.setBaseline(A, sn(s[A]));
    q.registerOptimistic(p, l), q.setPropsQuietly({ ...s, ...c });
    let m = !0;
    const g = i.onSuccess;
    i.onSuccess = (A) => (m = !1, g(A));
    const S = i.onFinish;
    i.onFinish = (A) => {
      if (q.unregisterOptimistic(p), m && q.get().component === d) {
        const w = q.replayOptimistics();
        Object.keys(w).length > 0 && q.setPropsQuietly({ ...q.get().props, ...w });
      }
      return q.pendingOptimisticCount() === 0 && q.clearOptimisticState(), S(A);
    };
  }
  loadDeferredProps(l) {
    l && Object.values(l).forEach((i) => {
      this.doReload({ only: i, deferredProps: !0, preserveErrors: !0 });
    });
  }
}, qs = class {
  /**
   * Creates a callback that returns a UrlMethodPair.
   *
   * createWayfinderCallback(urlMethodPair)
   * createWayfinderCallback(method, url)
   * createWayfinderCallback(() => urlMethodPair)
   * createWayfinderCallback(() => method, () => url)
   */
  static createWayfinderCallback(...l) {
    return () => l.length === 1 ? un(l[0]) ? l[0] : l[0]() : {
      method: typeof l[0] == "function" ? l[0]() : l[0],
      url: typeof l[1] == "function" ? l[1]() : l[1]
    };
  }
  /**
   * Parses all useForm() arguments into { rememberKey, data, precognitionEndpoint }.
   *
   * useForm()
   * useForm(data)
   * useForm(rememberKey, data)
   * useForm(method, url, data)
   * useForm(urlMethodPair, data)
   *
   */
  static parseUseFormArguments(...l) {
    return l.length === 0 ? {
      rememberKey: null,
      data: {},
      precognitionEndpoint: null
    } : l.length === 1 ? {
      rememberKey: null,
      data: l[0],
      precognitionEndpoint: null
    } : l.length === 2 ? typeof l[0] == "string" ? {
      rememberKey: l[0],
      data: l[1],
      precognitionEndpoint: null
    } : {
      rememberKey: null,
      data: l[1],
      precognitionEndpoint: this.createWayfinderCallback(l[0])
    } : {
      rememberKey: null,
      data: l[2],
      precognitionEndpoint: this.createWayfinderCallback(l[0], l[1])
    };
  }
  /**
   * Parses all submission arguments into { method, url, options }.
   * It uses the Precognition endpoint if no explicit method/url are provided.
   *
   * form.submit(method, url)
   * form.submit(method, url, options)
   * form.submit(urlMethodPair)
   * form.submit(urlMethodPair, options)
   * form.submit()
   * form.submit(options)
   */
  static parseSubmitArguments(l, i) {
    return l.length === 3 || l.length === 2 && typeof l[0] == "string" ? { method: l[0], url: l[1], options: l[2] ?? {} } : un(l[0]) ? { ...l[0], options: l[1] ?? {} } : { ...i(), options: l[0] ?? {} };
  }
  /**
   * Merges headers into the Precognition validate() arguments.
   */
  static mergeHeadersForValidation(l, i, s) {
    const c = (o) => (o.headers = {
      ...s ?? {},
      ...o.headers ?? {}
    }, o);
    return l && typeof l == "object" && !("target" in l) ? l = c(l) : i && typeof i == "object" ? i = c(i) : typeof l == "string" ? i = c(i ?? {}) : l = c(l ?? {}), [l, i];
  }
};
function Qb(l) {
  if (!l.includes("."))
    return l;
  const i = (s) => s.startsWith("[") && s.endsWith("]") ? s : s.split(".").reduce((c, o, p) => p === 0 ? o : `${c}[${o}]`);
  return l.replace(/\\\./g, "__ESCAPED_DOT__").split(/(\[[^\]]*\])/).filter(Boolean).map(i).join("").replace(/__ESCAPED_DOT__/g, ".");
}
function Gb(l) {
  const i = [], s = /([^\[\]]+)|\[(\d*)\]/g;
  let c;
  for (; (c = s.exec(l)) !== null; )
    c[1] !== void 0 ? i.push(c[1]) : c[2] !== void 0 && i.push(c[2] === "" ? "" : Number(c[2]));
  return i;
}
function Zb(l, i, s) {
  let c = l;
  for (let o = 0; o < i.length - 1; o++)
    i[o] in c || (c[i[o]] = {}), c = c[i[o]];
  c[i[i.length - 1]] = s;
}
function Vb(l) {
  const i = Object.keys(l), s = i.filter((c) => /^\d+$/.test(c)).map(Number).sort((c, o) => c - o);
  return i.length === s.length && s.length > 0 && s[0] === 0 && s.every((c, o) => c === o);
}
function ys(l) {
  if (Array.isArray(l))
    return l.map(ys);
  if (typeof l != "object" || l === null || Xf(l))
    return l;
  if (Vb(l)) {
    const s = [];
    for (let c = 0; c < Object.keys(l).length; c++)
      s[c] = ys(l[c]);
    return s;
  }
  const i = {};
  for (const s in l)
    i[s] = ys(l[s]);
  return i;
}
function fp(l) {
  const i = {};
  for (const [s, c] of l.entries()) {
    if (c instanceof File && c.size === 0 && c.name === "")
      continue;
    const o = Gb(Qb(s));
    if (o[o.length - 1] === "") {
      const p = o.slice(0, -1), d = mt(i, p);
      if (Array.isArray(d))
        d.push(c);
      else if (d && typeof d == "object" && !Xf(d)) {
        const m = Object.keys(d).filter((g) => /^\d+$/.test(g)).map(Number).sort((g, S) => g - S);
        _n(i, p, m.length > 0 ? [...m.map((g) => d[g]), c] : [c]);
      } else
        _n(i, p, [c]);
      continue;
    }
    Zb(i, o.map(String), c);
  }
  return ys(i);
}
var Kb = "X-Inertia-Infinite-Scroll-Merge-Intent", Pb = (l) => {
  const i = () => {
    const C = q.get().scrollProps?.[l.getPropName()];
    if (C)
      return C;
    throw new Error(`The page object does not contain a scroll prop named "${l.getPropName()}".`);
  }, s = {
    component: null,
    loading: !1,
    previousPage: null,
    nextPage: null,
    lastLoadedPage: null,
    requestCount: 0
  }, c = () => {
    const C = i();
    s.component = q.get().component, s.loading = !1, s.previousPage = C.previousPage, s.nextPage = C.nextPage, s.lastLoadedPage = C.currentPage, s.requestCount = 0;
  }, o = () => `inertia:infinite-scroll-data:${l.getPropName()}`;
  if (typeof window < "u") {
    c();
    const C = Ze.restore(o());
    C && typeof C == "object" && C.lastLoadedPage === i().currentPage && (s.previousPage = C.previousPage, s.nextPage = C.nextPage, s.lastLoadedPage = C.lastLoadedPage, s.requestCount = C.requestCount || 0);
  }
  const p = Ze.on("success", (C) => {
    s.component === C.detail.page.component && i().reset && (c(), l.onReset?.());
  }), d = (C) => C === "next" ? "nextPage" : "previousPage", m = (C) => {
    const ce = d(C);
    return s[ce];
  }, g = (C) => {
    const ce = i(), me = d(C);
    s.lastLoadedPage = ce.currentPage, s[me] = ce[me], s.requestCount += 1, Ze.remember(
      {
        previousPage: s.previousPage,
        nextPage: s.nextPage,
        lastLoadedPage: s.lastLoadedPage,
        requestCount: s.requestCount
      },
      o()
    );
  }, S = () => i().pageName, A = () => s.requestCount, w = (C, ce = {}) => {
    const me = m(C);
    s.loading || me === null || (s.loading = !0, Ze.reload({
      preserveErrors: !0,
      ...ce,
      data: { ...ce.data || {}, [S()]: me },
      only: [...ce.only || [], l.getPropName()],
      preserveUrl: !0,
      // we handle URL updates manually via useInfiniteScrollQueryString()
      headers: {
        [Kb]: C === "previous" ? "prepend" : "append",
        ...ce.headers
      },
      onBefore: (fe) => {
        C === "next" ? l.onBeforeNextRequest() : l.onBeforePreviousRequest(), ce.onBefore?.(fe);
      },
      onBeforeUpdate: (fe) => {
        l.onBeforeUpdate(), ce.onBeforeUpdate?.(fe);
      },
      onSuccess: (fe) => {
        g(C), ce.onSuccess?.(fe);
      },
      onFinish: (fe) => {
        s.loading = !1, C === "next" ? l.onCompleteNextRequest(s.lastLoadedPage) : l.onCompletePreviousRequest(s.lastLoadedPage), ce.onFinish?.(fe);
      }
    }));
  };
  return {
    getLastLoadedPage: () => s.lastLoadedPage,
    getPageName: S,
    getRequestCount: A,
    hasPrevious: () => !!s.previousPage,
    hasNext: () => !!s.nextPage,
    fetchNext: (C) => w("next", C),
    fetchPrevious: (C) => w("previous", C),
    removeEventListener: p
  };
}, Jb = () => {
  const l = [];
  return {
    new: (c, o = {}) => {
      const p = new IntersectionObserver((d) => {
        for (const m of d)
          m.isIntersecting && c(m);
      }, o);
      return l.push(p), p;
    },
    flushAll: () => {
      l.forEach((c) => c.disconnect()), l.length = 0;
    }
  };
}, gs = "infiniteScrollPage", af = "infiniteScrollIgnore", Cy = (l) => l.dataset[gs], Fb = (l) => {
  const i = Jb();
  let s, c, o, p, d = !1;
  const m = () => {
    p = new MutationObserver((I) => {
      I.forEach((ne) => {
        ne.addedNodes.forEach((ue) => {
          ue.nodeType === Node.ELEMENT_NODE && N.add(ue);
        });
      }), fe();
    }), p.observe(l.getItemsElement(), { childList: !0 }), s = i.new(
      (I) => l.onItemIntersected(I.target)
    );
    const K = {
      root: l.getScrollableParent(),
      rootMargin: `${Math.max(1, l.getTriggerMargin())}px`
    };
    c = i.new(l.onPreviousTriggered, K), o = i.new(l.onNextTriggered, K);
  }, g = () => {
    d && S();
    const K = l.getStartElement(), I = l.getEndElement();
    K && l.shouldFetchPrevious() && c.observe(K), I && l.shouldFetchNext() && o.observe(I), d = !0;
  }, S = () => {
    d && (c.disconnect(), o.disconnect(), d = !1);
  }, A = () => {
    d && g();
  }, w = () => {
    S(), i.flushAll(), p?.disconnect();
  }, N = /* @__PURE__ */ new Set(), _ = (K) => !(gs in K.dataset) && !(af in K.dataset), B = () => {
    Array.from(N).forEach((K) => {
      _(K) && (K.dataset[af] = "true"), s.observe(K);
    }), N.clear();
  }, Z = (K) => Array.from(
    K.querySelectorAll(
      ":scope > *:not([data-infinite-scroll-page]):not([data-infinite-scroll-ignore])"
    )
  );
  let oe = !1;
  const C = (K) => {
    !oe && (oe = !0, Be()) || (Z(l.getItemsElement()).forEach((I) => {
      _(I) && (I.dataset[gs] = K?.toString() || "1"), s.observe(I);
    }), me());
  }, ce = () => `inertia:infinite-scroll-elements:${l.getPropName()}`, me = () => {
    const K = {}, I = l.getItemsElement().childNodes;
    for (let ne = 0; ne < I.length; ne++) {
      const ue = I[ne];
      if (ue.nodeType !== Node.ELEMENT_NODE)
        continue;
      const V = Cy(ue);
      typeof V > "u" || (V in K ? K[V].to = ne : K[V] = { from: ne, to: ne });
    }
    Ze.remember(K, ce());
  }, fe = Ms(me, 250), Be = () => {
    const K = Ze.restore(ce());
    if (!K || typeof K != "object")
      return !1;
    const I = l.getItemsElement().childNodes;
    for (let ne = 0; ne < I.length; ne++) {
      const ue = I[ne];
      if (ue.nodeType !== Node.ELEMENT_NODE)
        continue;
      const V = ue;
      let j;
      for (const [H, Y] of Object.entries(K))
        if (ne >= Y.from && ne <= Y.to) {
          j = H;
          break;
        }
      if (j)
        V.dataset[gs] = j;
      else if (_(V))
        V.dataset[af] = "true";
      else
        continue;
      s.observe(V);
    }
    return !0;
  };
  return {
    setupObservers: m,
    enableTriggers: g,
    disableTriggers: S,
    refreshTriggers: A,
    flushAll: w,
    processManuallyAddedElements: B,
    processServerLoadedElements: C
  };
}, $b = new Xs(), Ea, fl, as = null, Wb = (l) => {
  let i = !0;
  const s = (o) => {
    $b.add(() => new Promise((p) => {
      if (!i)
        return Ea = fl = null, p();
      if (!Ea || !fl) {
        const g = q.get().url;
        Ea = tn(g), fl = tn(g), as = qy(g);
      }
      const d = l.getPageName(), m = fl.searchParams;
      o === "1" ? m.delete(d) : m.set(d, o), setTimeout(() => p());
    })).finally(() => {
      i && Ea && fl && Ea.href !== fl.href && as !== null && Ze.replace({
        url: Ab(fl, as),
        preserveScroll: !0,
        preserveState: !0
      }), Ea = fl = as = null;
    });
  };
  return {
    onItemIntersected: Ms((o) => {
      const p = l.getItemsElement();
      if (!i || l.shouldPreserveUrl() || !o || !p)
        return;
      const d = /* @__PURE__ */ new Map(), m = [...p.children];
      My(m, o).forEach((A) => {
        const w = Cy(A) ?? "1";
        d.has(w) ? d.set(w, d.get(w) + 1) : d.set(w, 1);
      });
      const S = Array.from(d.entries()).sort((A, w) => w[1] - A[1])[0]?.[0];
      S !== void 0 && s(S);
    }, 250),
    cancel: () => i = !1
  };
}, kb = (l) => ({
  createCallbacks: () => {
    let s, c = null, o = 0;
    return {
      captureScrollPosition: () => {
        const m = l.getScrollableParent(), g = l.getItemsElement();
        s = m?.scrollTop || window.scrollY;
        const S = My([...g.children]);
        if (S.length > 0) {
          c = S[0];
          const A = m?.getBoundingClientRect() || { top: 0 }, w = m ? A.top : 0;
          o = c.getBoundingClientRect().top - w;
        }
      },
      restoreScrollPosition: () => {
        if (!c)
          return;
        let m = 0, g = !1;
        const S = () => {
          if (m++, g || m > 10)
            return !1;
          const A = l.getScrollableParent(), w = A?.getBoundingClientRect() || { top: 0 }, N = A ? w.top : 0, Z = c.getBoundingClientRect().top - N - o;
          if (Z === 0) {
            window.requestAnimationFrame(S);
            return;
          }
          A ? A.scrollTo({ top: s + Z }) : window.scrollTo(0, window.scrollY + Z), g = !0;
        };
        window.requestAnimationFrame(S);
      }
    };
  }
});
function Ib(l) {
  const i = Wb({ ...l, getPageName: () => o.getPageName() }), s = kb(l), c = Fb({
    ...l,
    // As items enter viewport, update URL to reflect the most visible page
    onItemIntersected: i.onItemIntersected,
    onPreviousTriggered: () => o.fetchPrevious(),
    onNextTriggered: () => o.fetchNext()
  }), o = Pb({
    ...l,
    // Before updating page data, tag any manually added DOM elements
    // so they don't get confused with server-loaded content
    onBeforeUpdate: c.processManuallyAddedElements,
    // After successful request, tag new server content
    onCompletePreviousRequest: (S) => {
      l.onCompletePreviousRequest(), Ci(() => c.processServerLoadedElements(S), 2);
    },
    onCompleteNextRequest: (S) => {
      l.onCompleteNextRequest(), Ci(() => c.processServerLoadedElements(S), 2);
    },
    onReset: l.onDataReset
  }), p = (S) => {
    const { captureScrollPosition: A, restoreScrollPosition: w } = s.createCallbacks(), N = S.onBeforeUpdate || (() => {
    }), _ = S.onSuccess || (() => {
    });
    return S.onBeforeUpdate = (B) => {
      N(B), A();
    }, S.onSuccess = (B) => {
      _(B), w();
    }, S;
  }, d = o.fetchNext;
  o.fetchNext = (S = {}) => {
    S = { ...l.getReloadOptions?.(), ...S }, l.inReverseMode() && (S = p(S)), d(S);
  };
  const m = o.fetchPrevious;
  o.fetchPrevious = (S = {}) => {
    S = { ...l.getReloadOptions?.(), ...S }, l.inReverseMode() || (S = p(S)), m(S);
  };
  const g = Ze.on("success", () => Ci(c.refreshTriggers, 2));
  return {
    dataManager: o,
    elementManager: c,
    flush: () => {
      g(), o.removeEventListener(), c.flushAll(), i.cancel();
    }
  };
}
function Ly(l) {
  return l.target instanceof HTMLElement && l.target.isContentEditable || l.defaultPrevented;
}
function is(l) {
  const i = l.currentTarget.tagName.toLowerCase() === "a";
  return !(Ly(l) || i && l.altKey || i && l.ctrlKey || i && l.metaKey || i && l.shiftKey || i && "button" in l && l.button !== 0);
}
function op(l) {
  const i = l.currentTarget.tagName.toLowerCase() === "button";
  return !Ly(l) && (l.key === "Enter" || i && l.key === " ");
}
var et = "nprogress", jl, tt, vt = {
  minimum: 0.08,
  easing: "linear",
  speed: 200,
  trickle: !0,
  trickleSpeed: 200,
  showSpinner: !0,
  barSelector: '[role="bar"]',
  spinnerSelector: '[role="spinner"]',
  parent: "body",
  color: "#29d",
  includeCSS: !0,
  popover: null,
  template: [
    '<div class="bar" role="bar">',
    '<div class="peg"></div>',
    "</div>",
    '<div class="spinner" role="spinner">',
    '<div class="spinner-icon"></div>',
    "</div>"
  ].join("")
}, hl = null, js = !1, e1 = (l) => {
  Object.assign(vt, l), jl = vt.popover ?? "popover" in HTMLElement.prototype, vt.includeCSS && i1(vt.color), tt = document.createElement("div"), tt.id = et, tt.innerHTML = vt.template, jl && (tt.popover = "manual");
}, Ys = (l) => {
  const i = Xy();
  l = Vy(l, vt.minimum, 1), hl = l === 1 ? null : l;
  const s = n1(!i), c = s.querySelector(vt.barSelector), o = vt.speed, p = vt.easing;
  s.offsetWidth, a1((d) => {
    const m = {
      transition: `all ${o}ms ${p}`,
      transform: `translate3d(${Ky(l)}%,0,0)`
    };
    for (const g in m)
      c.style[g] = m[g];
    if (l !== 1)
      return setTimeout(d, o);
    s.style.transition = "none", s.style.opacity = "1", s.offsetWidth, setTimeout(() => {
      s.style.transition = `all ${o}ms linear`, s.style.opacity = "0", setTimeout(() => {
        Zy(), s.style.transition = "", s.style.opacity = "", d();
      }, o);
    }, o);
  });
}, Xy = () => typeof hl == "number", Yy = () => {
  hl || Ys(0);
  const l = function() {
    setTimeout(function() {
      hl && (Qy(), l());
    }, vt.trickleSpeed);
  };
  vt.trickle && l();
}, t1 = (l) => {
  !l && !hl || (Qy(0.3 + 0.5 * Math.random()), Ys(1));
}, Qy = (l) => {
  const i = hl;
  if (i === null)
    return Yy();
  if (!(i > 1))
    return l = typeof l == "number" ? l : (() => {
      const s = {
        0.1: [0, 0.2],
        0.04: [0.2, 0.5],
        0.02: [0.5, 0.8],
        5e-3: [0.8, 0.99]
      };
      for (const c in s)
        if (i >= s[c][0] && i < s[c][1])
          return parseFloat(c);
      return 0;
    })(), Ys(Vy(i + l, 0, 0.994));
}, n1 = (l) => {
  if (l1())
    return document.getElementById(et);
  document.documentElement.classList.add(`${et}-busy`);
  const i = tt.querySelector(vt.barSelector), s = l ? "-100" : Ky(hl || 0);
  if (i.style.transition = "all 0 linear", i.style.transform = `translate3d(${s}%,0,0)`, vt.showSpinner || tt.querySelector(vt.spinnerSelector)?.remove(), jl)
    document.body.appendChild(tt), js || tt.showPopover();
  else {
    const c = Gy();
    c !== document.body && c.classList.add(`${et}-custom-parent`), c.appendChild(tt), js && (tt.style.display = "none");
  }
  return tt;
}, Gy = () => document.querySelector(vt.parent), Zy = () => {
  if (document.documentElement.classList.remove(`${et}-busy`), jl && tt?.isConnected)
    try {
      tt.hidePopover();
    } catch {
    }
  jl || Gy().classList.remove(`${et}-custom-parent`), tt?.remove();
}, l1 = () => document.getElementById(et) !== null;
function Vy(l, i, s) {
  return l < i ? i : l > s ? s : l;
}
var Ky = (l) => (-1 + l) * 100, a1 = /* @__PURE__ */ (() => {
  const l = [], i = () => {
    const s = l.shift();
    s && s(i);
  };
  return (s) => {
    l.push(s), l.length === 1 && i();
  };
})(), i1 = (l) => {
  const i = document.createElement("style");
  i.textContent = `
    #${et} {
      pointer-events: none;
      background: none;
      border: none;
      margin: 0;
      padding: 0;
      overflow: visible;
      inset: unset;
      width: 100%;
      height: 0;
      position: fixed;
      top: 0;
      left: 0;
    }

    #${et}::backdrop {
      display: none;
    }

    #${et} .bar {
      background: ${l};

      position: fixed;
      z-index: 1031;
      top: 0;
      left: 0;

      width: 100%;
      height: 2px;
    }

    #${et} .peg {
      display: block;
      position: absolute;
      right: 0px;
      width: 100px;
      height: 100%;
      box-shadow: 0 0 10px ${l}, 0 0 5px ${l};
      opacity: 1.0;

      transform: rotate(3deg) translate(0px, -4px);
    }

    #${et} .spinner {
      display: block;
      position: fixed;
      z-index: 1031;
      top: 15px;
      right: 15px;
    }

    #${et} .spinner-icon {
      width: 18px;
      height: 18px;
      box-sizing: border-box;

      border: solid 2px transparent;
      border-top-color: ${l};
      border-left-color: ${l};
      border-radius: 50%;

      animation: ${et}-spinner 400ms linear infinite;
    }

    .${et}-custom-parent {
      overflow: hidden;
      position: relative;
    }

    .${et}-custom-parent #${et} .spinner,
    .${et}-custom-parent #${et} .bar {
      position: absolute;
    }

    @keyframes ${et}-spinner {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, document.head.appendChild(i);
}, r1 = () => {
  if (js = !1, !!tt?.isConnected)
    if (jl)
      try {
        tt.showPopover();
      } catch {
      }
    else
      tt.style.display = "";
}, s1 = () => {
  if (js = !0, !!tt?.isConnected)
    if (jl)
      try {
        tt.hidePopover();
      } catch {
      }
    else
      tt.style.display = "none";
}, hn = {
  configure: e1,
  isStarted: Xy,
  done: t1,
  set: Ys,
  remove: Zy,
  start: Yy,
  status: hl,
  show: r1,
  hide: s1
}, u1 = class {
  hideCount = 0;
  start() {
    hn.start();
  }
  reveal(l = !1) {
    this.hideCount = Math.max(0, this.hideCount - 1), (l || this.hideCount === 0) && hn.show();
  }
  hide() {
    this.hideCount++, hn.hide();
  }
  set(l) {
    hn.set(Math.max(0, Math.min(1, l)));
  }
  finish() {
    hn.done();
  }
  reset() {
    hn.set(0);
  }
  remove() {
    hn.done(), hn.remove();
  }
  isStarted() {
    return hn.isStarted();
  }
  getStatus() {
    return hn.status;
  }
}, rf = new u1(), Py = /* @__PURE__ */ Symbol("FormComponentReset");
function zf(l) {
  return l instanceof HTMLInputElement || l instanceof HTMLSelectElement || l instanceof HTMLTextAreaElement;
}
function c1(l, i) {
  const s = l.value, c = l.checked;
  switch (l.type.toLowerCase()) {
    case "checkbox":
      l.checked = i.includes(l.value);
      break;
    case "radio":
      l.checked = i[0] === l.value;
      break;
    case "file":
      l.value = "";
      break;
    case "button":
    case "submit":
    case "reset":
    case "image":
      break;
    default:
      l.value = i[0] !== null && i[0] !== void 0 ? String(i[0]) : "";
  }
  return l.value !== s || l.checked !== c;
}
function f1(l, i) {
  const s = l.value, c = Array.from(l.selectedOptions).map((d) => d.value);
  if (l.multiple) {
    const d = i.map((m) => String(m));
    Array.from(l.options).forEach((m) => {
      m.selected = d.includes(m.value);
    });
  } else
    l.value = i[0] !== void 0 ? String(i[0]) : "";
  const o = Array.from(l.selectedOptions).map((d) => d.value);
  return l.multiple ? JSON.stringify(c.sort()) !== JSON.stringify(o.sort()) : l.value !== s;
}
function sf(l, i) {
  if (l.disabled) {
    if (l instanceof HTMLInputElement) {
      const s = l.value, c = l.checked;
      switch (l.type.toLowerCase()) {
        case "checkbox":
        case "radio":
          return l.checked = l.defaultChecked, l.checked !== c;
        case "file":
          return l.value = "", s !== "";
        case "button":
        case "submit":
        case "reset":
        case "image":
          return !1;
        default:
          return l.value = l.defaultValue, l.value !== s;
      }
    } else if (l instanceof HTMLSelectElement) {
      const s = Array.from(l.selectedOptions).map((o) => o.value);
      Array.from(l.options).forEach((o) => {
        o.selected = o.defaultSelected;
      });
      const c = Array.from(l.selectedOptions).map((o) => o.value);
      return JSON.stringify(s.sort()) !== JSON.stringify(c.sort());
    } else if (l instanceof HTMLTextAreaElement) {
      const s = l.value;
      return l.value = l.defaultValue, l.value !== s;
    }
    return !1;
  }
  if (l instanceof HTMLInputElement)
    return c1(l, i);
  if (l instanceof HTMLSelectElement)
    return f1(l, i);
  if (l instanceof HTMLTextAreaElement) {
    const s = l.value;
    return l.value = i[0] !== void 0 ? String(i[0]) : "", l.value !== s;
  }
  return !1;
}
function o1(l, i) {
  let s = !1;
  return l instanceof RadioNodeList || l instanceof HTMLCollection ? Array.from(l).forEach((c, o) => {
    if (c instanceof Element && zf(c))
      if (c instanceof HTMLInputElement && ["checkbox", "radio"].includes(c.type.toLowerCase()))
        sf(c, i) && (s = !0);
      else {
        const p = i[o] !== void 0 ? [i[o]] : [i[0] ?? null].filter(Boolean);
        sf(c, p) && (s = !0);
      }
  }) : zf(l) && (s = sf(l, i)), s;
}
function d1(l, i, s) {
  if (!l)
    return;
  const c = !s || s.length === 0;
  if (c) {
    const p = new FormData(l), d = Array.from(l.elements).map((m) => zf(m) ? m.name : "").filter(Boolean);
    s = [.../* @__PURE__ */ new Set([...i.keys(), ...p.keys(), ...d])];
  }
  let o = !1;
  s.forEach((p) => {
    const d = l.elements.namedItem(p);
    d && o1(d, i.getAll(p)) && (o = !0);
  }), o && c && l.dispatchEvent(
    new CustomEvent("reset", { bubbles: !0, cancelable: !0, detail: { [Py]: !0 } })
  );
}
var Ze = new Yb();
var uf = { exports: {} }, Ri = {}, cf = { exports: {} }, ff = {};
var dp;
function h1() {
  return dp || (dp = 1, (function(l) {
    function i(b, x) {
      var L = b.length;
      b.push(x);
      e: for (; 0 < L; ) {
        var P = L - 1 >>> 1, le = b[P];
        if (0 < o(le, x))
          b[P] = x, b[L] = le, L = P;
        else break e;
      }
    }
    function s(b) {
      return b.length === 0 ? null : b[0];
    }
    function c(b) {
      if (b.length === 0) return null;
      var x = b[0], L = b.pop();
      if (L !== x) {
        b[0] = L;
        e: for (var P = 0, le = b.length, Ee = le >>> 1; P < Ee; ) {
          var J = 2 * (P + 1) - 1, ee = b[J], ae = J + 1, qe = b[ae];
          if (0 > o(ee, L))
            ae < le && 0 > o(qe, ee) ? (b[P] = qe, b[ae] = L, P = ae) : (b[P] = ee, b[J] = L, P = J);
          else if (ae < le && 0 > o(qe, L))
            b[P] = qe, b[ae] = L, P = ae;
          else break e;
        }
      }
      return x;
    }
    function o(b, x) {
      var L = b.sortIndex - x.sortIndex;
      return L !== 0 ? L : b.id - x.id;
    }
    if (l.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var p = performance;
      l.unstable_now = function() {
        return p.now();
      };
    } else {
      var d = Date, m = d.now();
      l.unstable_now = function() {
        return d.now() - m;
      };
    }
    var g = [], S = [], A = 1, w = null, N = 3, _ = !1, B = !1, Z = !1, oe = !1, C = typeof setTimeout == "function" ? setTimeout : null, ce = typeof clearTimeout == "function" ? clearTimeout : null, me = typeof setImmediate < "u" ? setImmediate : null;
    function fe(b) {
      for (var x = s(S); x !== null; ) {
        if (x.callback === null) c(S);
        else if (x.startTime <= b)
          c(S), x.sortIndex = x.expirationTime, i(g, x);
        else break;
        x = s(S);
      }
    }
    function Be(b) {
      if (Z = !1, fe(b), !B)
        if (s(g) !== null)
          B = !0, K || (K = !0, H());
        else {
          var x = s(S);
          x !== null && be(Be, x.startTime - b);
        }
    }
    var K = !1, I = -1, ne = 5, ue = -1;
    function V() {
      return oe ? !0 : !(l.unstable_now() - ue < ne);
    }
    function j() {
      if (oe = !1, K) {
        var b = l.unstable_now();
        ue = b;
        var x = !0;
        try {
          e: {
            B = !1, Z && (Z = !1, ce(I), I = -1), _ = !0;
            var L = N;
            try {
              t: {
                for (fe(b), w = s(g); w !== null && !(w.expirationTime > b && V()); ) {
                  var P = w.callback;
                  if (typeof P == "function") {
                    w.callback = null, N = w.priorityLevel;
                    var le = P(
                      w.expirationTime <= b
                    );
                    if (b = l.unstable_now(), typeof le == "function") {
                      w.callback = le, fe(b), x = !0;
                      break t;
                    }
                    w === s(g) && c(g), fe(b);
                  } else c(g);
                  w = s(g);
                }
                if (w !== null) x = !0;
                else {
                  var Ee = s(S);
                  Ee !== null && be(
                    Be,
                    Ee.startTime - b
                  ), x = !1;
                }
              }
              break e;
            } finally {
              w = null, N = L, _ = !1;
            }
            x = void 0;
          }
        } finally {
          x ? H() : K = !1;
        }
      }
    }
    var H;
    if (typeof me == "function")
      H = function() {
        me(j);
      };
    else if (typeof MessageChannel < "u") {
      var Y = new MessageChannel(), $ = Y.port2;
      Y.port1.onmessage = j, H = function() {
        $.postMessage(null);
      };
    } else
      H = function() {
        C(j, 0);
      };
    function be(b, x) {
      I = C(function() {
        b(l.unstable_now());
      }, x);
    }
    l.unstable_IdlePriority = 5, l.unstable_ImmediatePriority = 1, l.unstable_LowPriority = 4, l.unstable_NormalPriority = 3, l.unstable_Profiling = null, l.unstable_UserBlockingPriority = 2, l.unstable_cancelCallback = function(b) {
      b.callback = null;
    }, l.unstable_forceFrameRate = function(b) {
      0 > b || 125 < b ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : ne = 0 < b ? Math.floor(1e3 / b) : 5;
    }, l.unstable_getCurrentPriorityLevel = function() {
      return N;
    }, l.unstable_next = function(b) {
      switch (N) {
        case 1:
        case 2:
        case 3:
          var x = 3;
          break;
        default:
          x = N;
      }
      var L = N;
      N = x;
      try {
        return b();
      } finally {
        N = L;
      }
    }, l.unstable_requestPaint = function() {
      oe = !0;
    }, l.unstable_runWithPriority = function(b, x) {
      switch (b) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          b = 3;
      }
      var L = N;
      N = b;
      try {
        return x();
      } finally {
        N = L;
      }
    }, l.unstable_scheduleCallback = function(b, x, L) {
      var P = l.unstable_now();
      switch (typeof L == "object" && L !== null ? (L = L.delay, L = typeof L == "number" && 0 < L ? P + L : P) : L = P, b) {
        case 1:
          var le = -1;
          break;
        case 2:
          le = 250;
          break;
        case 5:
          le = 1073741823;
          break;
        case 4:
          le = 1e4;
          break;
        default:
          le = 5e3;
      }
      return le = L + le, b = {
        id: A++,
        callback: x,
        priorityLevel: b,
        startTime: L,
        expirationTime: le,
        sortIndex: -1
      }, L > P ? (b.sortIndex = L, i(S, b), s(g) === null && b === s(S) && (Z ? (ce(I), I = -1) : Z = !0, be(Be, L - P))) : (b.sortIndex = le, i(g, b), B || _ || (B = !0, K || (K = !0, H()))), b;
    }, l.unstable_shouldYield = V, l.unstable_wrapCallback = function(b) {
      var x = N;
      return function() {
        var L = N;
        N = x;
        try {
          return b.apply(this, arguments);
        } finally {
          N = L;
        }
      };
    };
  })(ff)), ff;
}
var hp;
function m1() {
  return hp || (hp = 1, cf.exports = h1()), cf.exports;
}
var mp;
function p1() {
  if (mp) return Ri;
  mp = 1;
  var l = m1(), i = window.React, s = window.ReactDOM;
  function c(e) {
    var t = "https://react.dev/errors/" + e;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var n = 2; n < arguments.length; n++)
        t += "&args[]=" + encodeURIComponent(arguments[n]);
    }
    return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function o(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
  }
  function p(e) {
    var t = e, n = e;
    if (e.alternate) for (; t.return; ) t = t.return;
    else {
      e = t;
      do
        t = e, (t.flags & 4098) !== 0 && (n = t.return), e = t.return;
      while (e);
    }
    return t.tag === 3 ? n : null;
  }
  function d(e) {
    if (e.tag === 13) {
      var t = e.memoizedState;
      if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function m(e) {
    if (e.tag === 31) {
      var t = e.memoizedState;
      if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function g(e) {
    if (p(e) !== e)
      throw Error(c(188));
  }
  function S(e) {
    var t = e.alternate;
    if (!t) {
      if (t = p(e), t === null) throw Error(c(188));
      return t !== e ? null : e;
    }
    for (var n = e, a = t; ; ) {
      var r = n.return;
      if (r === null) break;
      var u = r.alternate;
      if (u === null) {
        if (a = r.return, a !== null) {
          n = a;
          continue;
        }
        break;
      }
      if (r.child === u.child) {
        for (u = r.child; u; ) {
          if (u === n) return g(r), e;
          if (u === a) return g(r), t;
          u = u.sibling;
        }
        throw Error(c(188));
      }
      if (n.return !== a.return) n = r, a = u;
      else {
        for (var f = !1, h = r.child; h; ) {
          if (h === n) {
            f = !0, n = r, a = u;
            break;
          }
          if (h === a) {
            f = !0, a = r, n = u;
            break;
          }
          h = h.sibling;
        }
        if (!f) {
          for (h = u.child; h; ) {
            if (h === n) {
              f = !0, n = u, a = r;
              break;
            }
            if (h === a) {
              f = !0, a = u, n = r;
              break;
            }
            h = h.sibling;
          }
          if (!f) throw Error(c(189));
        }
      }
      if (n.alternate !== a) throw Error(c(190));
    }
    if (n.tag !== 3) throw Error(c(188));
    return n.stateNode.current === n ? e : t;
  }
  function A(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e;
    for (e = e.child; e !== null; ) {
      if (t = A(e), t !== null) return t;
      e = e.sibling;
    }
    return null;
  }
  var w = Object.assign, N = /* @__PURE__ */ Symbol.for("react.element"), _ = /* @__PURE__ */ Symbol.for("react.transitional.element"), B = /* @__PURE__ */ Symbol.for("react.portal"), Z = /* @__PURE__ */ Symbol.for("react.fragment"), oe = /* @__PURE__ */ Symbol.for("react.strict_mode"), C = /* @__PURE__ */ Symbol.for("react.profiler"), ce = /* @__PURE__ */ Symbol.for("react.consumer"), me = /* @__PURE__ */ Symbol.for("react.context"), fe = /* @__PURE__ */ Symbol.for("react.forward_ref"), Be = /* @__PURE__ */ Symbol.for("react.suspense"), K = /* @__PURE__ */ Symbol.for("react.suspense_list"), I = /* @__PURE__ */ Symbol.for("react.memo"), ne = /* @__PURE__ */ Symbol.for("react.lazy"), ue = /* @__PURE__ */ Symbol.for("react.activity"), V = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), j = Symbol.iterator;
  function H(e) {
    return e === null || typeof e != "object" ? null : (e = j && e[j] || e["@@iterator"], typeof e == "function" ? e : null);
  }
  var Y = /* @__PURE__ */ Symbol.for("react.client.reference");
  function $(e) {
    if (e == null) return null;
    if (typeof e == "function")
      return e.$$typeof === Y ? null : e.displayName || e.name || null;
    if (typeof e == "string") return e;
    switch (e) {
      case Z:
        return "Fragment";
      case C:
        return "Profiler";
      case oe:
        return "StrictMode";
      case Be:
        return "Suspense";
      case K:
        return "SuspenseList";
      case ue:
        return "Activity";
    }
    if (typeof e == "object")
      switch (e.$$typeof) {
        case B:
          return "Portal";
        case me:
          return e.displayName || "Context";
        case ce:
          return (e._context.displayName || "Context") + ".Consumer";
        case fe:
          var t = e.render;
          return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
        case I:
          return t = e.displayName || null, t !== null ? t : $(e.type) || "Memo";
        case ne:
          t = e._payload, e = e._init;
          try {
            return $(e(t));
          } catch {
          }
      }
    return null;
  }
  var be = Array.isArray, b = i.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, x = s.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, L = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, P = [], le = -1;
  function Ee(e) {
    return { current: e };
  }
  function J(e) {
    0 > le || (e.current = P[le], P[le] = null, le--);
  }
  function ee(e, t) {
    le++, P[le] = e.current, e.current = t;
  }
  var ae = Ee(null), qe = Ee(null), Pe = Ee(null), ht = Ee(null);
  function Xe(e, t) {
    switch (ee(Pe, t), ee(qe, e), ee(ae, null), t.nodeType) {
      case 9:
      case 11:
        e = (e = t.documentElement) && (e = e.namespaceURI) ? om(e) : 0;
        break;
      default:
        if (e = t.tagName, t = t.namespaceURI)
          t = om(t), e = dm(t, e);
        else
          switch (e) {
            case "svg":
              e = 1;
              break;
            case "math":
              e = 2;
              break;
            default:
              e = 0;
          }
    }
    J(ae), ee(ae, e);
  }
  function Je() {
    J(ae), J(qe), J(Pe);
  }
  function _e(e) {
    e.memoizedState !== null && ee(ht, e);
    var t = ae.current, n = dm(t, e.type);
    t !== n && (ee(qe, e), ee(ae, n));
  }
  function Le(e) {
    qe.current === e && (J(ae), J(qe)), ht.current === e && (J(ht), gi._currentValue = L);
  }
  var rt, Ut;
  function Ne(e) {
    if (rt === void 0)
      try {
        throw Error();
      } catch (n) {
        var t = n.stack.trim().match(/\n( *(at )?)/);
        rt = t && t[1] || "", Ut = -1 < n.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < n.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + rt + e + Ut;
  }
  var te = !1;
  function ie(e, t) {
    if (!e || te) return "";
    te = !0;
    var n = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var a = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var U = function() {
                throw Error();
              };
              if (Object.defineProperty(U.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(U, []);
                } catch (D) {
                  var z = D;
                }
                Reflect.construct(e, [], U);
              } else {
                try {
                  U.call();
                } catch (D) {
                  z = D;
                }
                e.call(U.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (D) {
                z = D;
              }
              (U = e()) && typeof U.catch == "function" && U.catch(function() {
              });
            }
          } catch (D) {
            if (D && z && typeof D.stack == "string")
              return [D.stack, z.stack];
          }
          return [null, null];
        }
      };
      a.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var r = Object.getOwnPropertyDescriptor(
        a.DetermineComponentFrameRoot,
        "name"
      );
      r && r.configurable && Object.defineProperty(
        a.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var u = a.DetermineComponentFrameRoot(), f = u[0], h = u[1];
      if (f && h) {
        var y = f.split(`
`), R = h.split(`
`);
        for (r = a = 0; a < y.length && !y[a].includes("DetermineComponentFrameRoot"); )
          a++;
        for (; r < R.length && !R[r].includes(
          "DetermineComponentFrameRoot"
        ); )
          r++;
        if (a === y.length || r === R.length)
          for (a = y.length - 1, r = R.length - 1; 1 <= a && 0 <= r && y[a] !== R[r]; )
            r--;
        for (; 1 <= a && 0 <= r; a--, r--)
          if (y[a] !== R[r]) {
            if (a !== 1 || r !== 1)
              do
                if (a--, r--, 0 > r || y[a] !== R[r]) {
                  var M = `
` + y[a].replace(" at new ", " at ");
                  return e.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", e.displayName)), M;
                }
              while (1 <= a && 0 <= r);
            break;
          }
      }
    } finally {
      te = !1, Error.prepareStackTrace = n;
    }
    return (n = e ? e.displayName || e.name : "") ? Ne(n) : "";
  }
  function Q(e, t) {
    switch (e.tag) {
      case 26:
      case 27:
      case 5:
        return Ne(e.type);
      case 16:
        return Ne("Lazy");
      case 13:
        return e.child !== t && t !== null ? Ne("Suspense Fallback") : Ne("Suspense");
      case 19:
        return Ne("SuspenseList");
      case 0:
      case 15:
        return ie(e.type, !1);
      case 11:
        return ie(e.type.render, !1);
      case 1:
        return ie(e.type, !0);
      case 31:
        return Ne("Activity");
      default:
        return "";
    }
  }
  function ge(e) {
    try {
      var t = "", n = null;
      do
        t += Q(e, n), n = e, e = e.return;
      while (e);
      return t;
    } catch (a) {
      return `
Error generating stack: ` + a.message + `
` + a.stack;
    }
  }
  var W = Object.prototype.hasOwnProperty, we = l.unstable_scheduleCallback, nt = l.unstable_cancelCallback, St = l.unstable_shouldYield, Hl = l.unstable_requestPaint, st = l.unstable_now, ml = l.unstable_getCurrentPriorityLevel, Fe = l.unstable_ImmediatePriority, gn = l.unstable_UserBlockingPriority, Bl = l.unstable_NormalPriority, Ma = l.unstable_LowPriority, Zf = l.unstable_IdlePriority, wg = l.log, Ag = l.unstable_setDisableYieldValue, Ta = null, Nt = null;
  function Cn(e) {
    if (typeof wg == "function" && Ag(e), Nt && typeof Nt.setStrictMode == "function")
      try {
        Nt.setStrictMode(Ta, e);
      } catch {
      }
  }
  var xt = Math.clz32 ? Math.clz32 : zg, Og = Math.log, Rg = Math.LN2;
  function zg(e) {
    return e >>>= 0, e === 0 ? 32 : 31 - (Og(e) / Rg | 0) | 0;
  }
  var Qi = 256, Gi = 262144, Zi = 4194304;
  function pl(e) {
    var t = e & 42;
    if (t !== 0) return t;
    switch (e & -e) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return e & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return e & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return e & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return e;
    }
  }
  function Vi(e, t, n) {
    var a = e.pendingLanes;
    if (a === 0) return 0;
    var r = 0, u = e.suspendedLanes, f = e.pingedLanes;
    e = e.warmLanes;
    var h = a & 134217727;
    return h !== 0 ? (a = h & ~u, a !== 0 ? r = pl(a) : (f &= h, f !== 0 ? r = pl(f) : n || (n = h & ~e, n !== 0 && (r = pl(n))))) : (h = a & ~u, h !== 0 ? r = pl(h) : f !== 0 ? r = pl(f) : n || (n = a & ~e, n !== 0 && (r = pl(n)))), r === 0 ? 0 : t !== 0 && t !== r && (t & u) === 0 && (u = r & -r, n = t & -t, u >= n || u === 32 && (n & 4194048) !== 0) ? t : r;
  }
  function Ua(e, t) {
    return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
  }
  function Dg(e, t) {
    switch (e) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return t + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Vf() {
    var e = Zi;
    return Zi <<= 1, (Zi & 62914560) === 0 && (Zi = 4194304), e;
  }
  function Qs(e) {
    for (var t = [], n = 0; 31 > n; n++) t.push(e);
    return t;
  }
  function Na(e, t) {
    e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
  }
  function Mg(e, t, n, a, r, u) {
    var f = e.pendingLanes;
    e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
    var h = e.entanglements, y = e.expirationTimes, R = e.hiddenUpdates;
    for (n = f & ~n; 0 < n; ) {
      var M = 31 - xt(n), U = 1 << M;
      h[M] = 0, y[M] = -1;
      var z = R[M];
      if (z !== null)
        for (R[M] = null, M = 0; M < z.length; M++) {
          var D = z[M];
          D !== null && (D.lane &= -536870913);
        }
      n &= ~U;
    }
    a !== 0 && Kf(e, a, 0), u !== 0 && r === 0 && e.tag !== 0 && (e.suspendedLanes |= u & ~(f & ~t));
  }
  function Kf(e, t, n) {
    e.pendingLanes |= t, e.suspendedLanes &= ~t;
    var a = 31 - xt(t);
    e.entangledLanes |= t, e.entanglements[a] = e.entanglements[a] | 1073741824 | n & 261930;
  }
  function Pf(e, t) {
    var n = e.entangledLanes |= t;
    for (e = e.entanglements; n; ) {
      var a = 31 - xt(n), r = 1 << a;
      r & t | e[a] & t && (e[a] |= t), n &= ~r;
    }
  }
  function Jf(e, t) {
    var n = t & -t;
    return n = (n & 42) !== 0 ? 1 : Gs(n), (n & (e.suspendedLanes | t)) !== 0 ? 0 : n;
  }
  function Gs(e) {
    switch (e) {
      case 2:
        e = 1;
        break;
      case 8:
        e = 4;
        break;
      case 32:
        e = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        e = 128;
        break;
      case 268435456:
        e = 134217728;
        break;
      default:
        e = 0;
    }
    return e;
  }
  function Zs(e) {
    return e &= -e, 2 < e ? 8 < e ? (e & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Ff() {
    var e = x.p;
    return e !== 0 ? e : (e = window.event, e === void 0 ? 32 : Hm(e.type));
  }
  function $f(e, t) {
    var n = x.p;
    try {
      return x.p = e, t();
    } finally {
      x.p = n;
    }
  }
  var Ln = Math.random().toString(36).slice(2), ut = "__reactFiber$" + Ln, bt = "__reactProps$" + Ln, _l = "__reactContainer$" + Ln, Vs = "__reactEvents$" + Ln, Tg = "__reactListeners$" + Ln, Ug = "__reactHandles$" + Ln, Wf = "__reactResources$" + Ln, xa = "__reactMarker$" + Ln;
  function Ks(e) {
    delete e[ut], delete e[bt], delete e[Vs], delete e[Tg], delete e[Ug];
  }
  function Cl(e) {
    var t = e[ut];
    if (t) return t;
    for (var n = e.parentNode; n; ) {
      if (t = n[_l] || n[ut]) {
        if (n = t.alternate, t.child !== null || n !== null && n.child !== null)
          for (e = Sm(e); e !== null; ) {
            if (n = e[ut]) return n;
            e = Sm(e);
          }
        return t;
      }
      e = n, n = e.parentNode;
    }
    return null;
  }
  function Ll(e) {
    if (e = e[ut] || e[_l]) {
      var t = e.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return e;
    }
    return null;
  }
  function qa(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
    throw Error(c(33));
  }
  function Xl(e) {
    var t = e[Wf];
    return t || (t = e[Wf] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function at(e) {
    e[xa] = !0;
  }
  var kf = /* @__PURE__ */ new Set(), If = {};
  function yl(e, t) {
    Yl(e, t), Yl(e + "Capture", t);
  }
  function Yl(e, t) {
    for (If[e] = t, e = 0; e < t.length; e++)
      kf.add(t[e]);
  }
  var Ng = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), eo = {}, to = {};
  function xg(e) {
    return W.call(to, e) ? !0 : W.call(eo, e) ? !1 : Ng.test(e) ? to[e] = !0 : (eo[e] = !0, !1);
  }
  function Ki(e, t, n) {
    if (xg(t))
      if (n === null) e.removeAttribute(t);
      else {
        switch (typeof n) {
          case "undefined":
          case "function":
          case "symbol":
            e.removeAttribute(t);
            return;
          case "boolean":
            var a = t.toLowerCase().slice(0, 5);
            if (a !== "data-" && a !== "aria-") {
              e.removeAttribute(t);
              return;
            }
        }
        e.setAttribute(t, "" + n);
      }
  }
  function Pi(e, t, n) {
    if (n === null) e.removeAttribute(t);
    else {
      switch (typeof n) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(t);
          return;
      }
      e.setAttribute(t, "" + n);
    }
  }
  function vn(e, t, n, a) {
    if (a === null) e.removeAttribute(n);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(n);
          return;
      }
      e.setAttributeNS(t, n, "" + a);
    }
  }
  function Gt(e) {
    switch (typeof e) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return e;
      case "object":
        return e;
      default:
        return "";
    }
  }
  function no(e) {
    var t = e.type;
    return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function qg(e, t, n) {
    var a = Object.getOwnPropertyDescriptor(
      e.constructor.prototype,
      t
    );
    if (!e.hasOwnProperty(t) && typeof a < "u" && typeof a.get == "function" && typeof a.set == "function") {
      var r = a.get, u = a.set;
      return Object.defineProperty(e, t, {
        configurable: !0,
        get: function() {
          return r.call(this);
        },
        set: function(f) {
          n = "" + f, u.call(this, f);
        }
      }), Object.defineProperty(e, t, {
        enumerable: a.enumerable
      }), {
        getValue: function() {
          return n;
        },
        setValue: function(f) {
          n = "" + f;
        },
        stopTracking: function() {
          e._valueTracker = null, delete e[t];
        }
      };
    }
  }
  function Ps(e) {
    if (!e._valueTracker) {
      var t = no(e) ? "checked" : "value";
      e._valueTracker = qg(
        e,
        t,
        "" + e[t]
      );
    }
  }
  function lo(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var n = t.getValue(), a = "";
    return e && (a = no(e) ? e.checked ? "true" : "false" : e.value), e = a, e !== n ? (t.setValue(e), !0) : !1;
  }
  function Ji(e) {
    if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  var jg = /[\n"\\]/g;
  function Zt(e) {
    return e.replace(
      jg,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function Js(e, t, n, a, r, u, f, h) {
    e.name = "", f != null && typeof f != "function" && typeof f != "symbol" && typeof f != "boolean" ? e.type = f : e.removeAttribute("type"), t != null ? f === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + Gt(t)) : e.value !== "" + Gt(t) && (e.value = "" + Gt(t)) : f !== "submit" && f !== "reset" || e.removeAttribute("value"), t != null ? Fs(e, f, Gt(t)) : n != null ? Fs(e, f, Gt(n)) : a != null && e.removeAttribute("value"), r == null && u != null && (e.defaultChecked = !!u), r != null && (e.checked = r && typeof r != "function" && typeof r != "symbol"), h != null && typeof h != "function" && typeof h != "symbol" && typeof h != "boolean" ? e.name = "" + Gt(h) : e.removeAttribute("name");
  }
  function ao(e, t, n, a, r, u, f, h) {
    if (u != null && typeof u != "function" && typeof u != "symbol" && typeof u != "boolean" && (e.type = u), t != null || n != null) {
      if (!(u !== "submit" && u !== "reset" || t != null)) {
        Ps(e);
        return;
      }
      n = n != null ? "" + Gt(n) : "", t = t != null ? "" + Gt(t) : n, h || t === e.value || (e.value = t), e.defaultValue = t;
    }
    a = a ?? r, a = typeof a != "function" && typeof a != "symbol" && !!a, e.checked = h ? e.checked : !!a, e.defaultChecked = !!a, f != null && typeof f != "function" && typeof f != "symbol" && typeof f != "boolean" && (e.name = f), Ps(e);
  }
  function Fs(e, t, n) {
    t === "number" && Ji(e.ownerDocument) === e || e.defaultValue === "" + n || (e.defaultValue = "" + n);
  }
  function Ql(e, t, n, a) {
    if (e = e.options, t) {
      t = {};
      for (var r = 0; r < n.length; r++)
        t["$" + n[r]] = !0;
      for (n = 0; n < e.length; n++)
        r = t.hasOwnProperty("$" + e[n].value), e[n].selected !== r && (e[n].selected = r), r && a && (e[n].defaultSelected = !0);
    } else {
      for (n = "" + Gt(n), t = null, r = 0; r < e.length; r++) {
        if (e[r].value === n) {
          e[r].selected = !0, a && (e[r].defaultSelected = !0);
          return;
        }
        t !== null || e[r].disabled || (t = e[r]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function io(e, t, n) {
    if (t != null && (t = "" + Gt(t), t !== e.value && (e.value = t), n == null)) {
      e.defaultValue !== t && (e.defaultValue = t);
      return;
    }
    e.defaultValue = n != null ? "" + Gt(n) : "";
  }
  function ro(e, t, n, a) {
    if (t == null) {
      if (a != null) {
        if (n != null) throw Error(c(92));
        if (be(a)) {
          if (1 < a.length) throw Error(c(93));
          a = a[0];
        }
        n = a;
      }
      n == null && (n = ""), t = n;
    }
    n = Gt(t), e.defaultValue = n, a = e.textContent, a === n && a !== "" && a !== null && (e.value = a), Ps(e);
  }
  function Gl(e, t) {
    if (t) {
      var n = e.firstChild;
      if (n && n === e.lastChild && n.nodeType === 3) {
        n.nodeValue = t;
        return;
      }
    }
    e.textContent = t;
  }
  var Hg = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function so(e, t, n) {
    var a = t.indexOf("--") === 0;
    n == null || typeof n == "boolean" || n === "" ? a ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : a ? e.setProperty(t, n) : typeof n != "number" || n === 0 || Hg.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px";
  }
  function uo(e, t, n) {
    if (t != null && typeof t != "object")
      throw Error(c(62));
    if (e = e.style, n != null) {
      for (var a in n)
        !n.hasOwnProperty(a) || t != null && t.hasOwnProperty(a) || (a.indexOf("--") === 0 ? e.setProperty(a, "") : a === "float" ? e.cssFloat = "" : e[a] = "");
      for (var r in t)
        a = t[r], t.hasOwnProperty(r) && n[r] !== a && so(e, r, a);
    } else
      for (var u in t)
        t.hasOwnProperty(u) && so(e, u, t[u]);
  }
  function $s(e) {
    if (e.indexOf("-") === -1) return !1;
    switch (e) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Bg = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), _g = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function Fi(e) {
    return _g.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
  }
  function Sn() {
  }
  var Ws = null;
  function ks(e) {
    return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
  }
  var Zl = null, Vl = null;
  function co(e) {
    var t = Ll(e);
    if (t && (e = t.stateNode)) {
      var n = e[bt] || null;
      e: switch (e = t.stateNode, t.type) {
        case "input":
          if (Js(
            e,
            n.value,
            n.defaultValue,
            n.defaultValue,
            n.checked,
            n.defaultChecked,
            n.type,
            n.name
          ), t = n.name, n.type === "radio" && t != null) {
            for (n = e; n.parentNode; ) n = n.parentNode;
            for (n = n.querySelectorAll(
              'input[name="' + Zt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < n.length; t++) {
              var a = n[t];
              if (a !== e && a.form === e.form) {
                var r = a[bt] || null;
                if (!r) throw Error(c(90));
                Js(
                  a,
                  r.value,
                  r.defaultValue,
                  r.defaultValue,
                  r.checked,
                  r.defaultChecked,
                  r.type,
                  r.name
                );
              }
            }
            for (t = 0; t < n.length; t++)
              a = n[t], a.form === e.form && lo(a);
          }
          break e;
        case "textarea":
          io(e, n.value, n.defaultValue);
          break e;
        case "select":
          t = n.value, t != null && Ql(e, !!n.multiple, t, !1);
      }
    }
  }
  var Is = !1;
  function fo(e, t, n) {
    if (Is) return e(t, n);
    Is = !0;
    try {
      var a = e(t);
      return a;
    } finally {
      if (Is = !1, (Zl !== null || Vl !== null) && (Br(), Zl && (t = Zl, e = Vl, Vl = Zl = null, co(t), e)))
        for (t = 0; t < e.length; t++) co(e[t]);
    }
  }
  function ja(e, t) {
    var n = e.stateNode;
    if (n === null) return null;
    var a = n[bt] || null;
    if (a === null) return null;
    n = a[t];
    e: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (a = !a.disabled) || (e = e.type, a = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !a;
        break e;
      default:
        e = !1;
    }
    if (e) return null;
    if (n && typeof n != "function")
      throw Error(
        c(231, t, typeof n)
      );
    return n;
  }
  var bn = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), eu = !1;
  if (bn)
    try {
      var Ha = {};
      Object.defineProperty(Ha, "passive", {
        get: function() {
          eu = !0;
        }
      }), window.addEventListener("test", Ha, Ha), window.removeEventListener("test", Ha, Ha);
    } catch {
      eu = !1;
    }
  var Xn = null, tu = null, $i = null;
  function oo() {
    if ($i) return $i;
    var e, t = tu, n = t.length, a, r = "value" in Xn ? Xn.value : Xn.textContent, u = r.length;
    for (e = 0; e < n && t[e] === r[e]; e++) ;
    var f = n - e;
    for (a = 1; a <= f && t[n - a] === r[u - a]; a++) ;
    return $i = r.slice(e, 1 < a ? 1 - a : void 0);
  }
  function Wi(e) {
    var t = e.keyCode;
    return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
  }
  function ki() {
    return !0;
  }
  function ho() {
    return !1;
  }
  function Et(e) {
    function t(n, a, r, u, f) {
      this._reactName = n, this._targetInst = r, this.type = a, this.nativeEvent = u, this.target = f, this.currentTarget = null;
      for (var h in e)
        e.hasOwnProperty(h) && (n = e[h], this[h] = n ? n(u) : u[h]);
      return this.isDefaultPrevented = (u.defaultPrevented != null ? u.defaultPrevented : u.returnValue === !1) ? ki : ho, this.isPropagationStopped = ho, this;
    }
    return w(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var n = this.nativeEvent;
        n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = ki);
      },
      stopPropagation: function() {
        var n = this.nativeEvent;
        n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = ki);
      },
      persist: function() {
      },
      isPersistent: ki
    }), t;
  }
  var gl = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(e) {
      return e.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Ii = Et(gl), Ba = w({}, gl, { view: 0, detail: 0 }), Cg = Et(Ba), nu, lu, _a, er = w({}, Ba, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: iu,
    button: 0,
    buttons: 0,
    relatedTarget: function(e) {
      return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
    },
    movementX: function(e) {
      return "movementX" in e ? e.movementX : (e !== _a && (_a && e.type === "mousemove" ? (nu = e.screenX - _a.screenX, lu = e.screenY - _a.screenY) : lu = nu = 0, _a = e), nu);
    },
    movementY: function(e) {
      return "movementY" in e ? e.movementY : lu;
    }
  }), mo = Et(er), Lg = w({}, er, { dataTransfer: 0 }), Xg = Et(Lg), Yg = w({}, Ba, { relatedTarget: 0 }), au = Et(Yg), Qg = w({}, gl, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Gg = Et(Qg), Zg = w({}, gl, {
    clipboardData: function(e) {
      return "clipboardData" in e ? e.clipboardData : window.clipboardData;
    }
  }), Vg = Et(Zg), Kg = w({}, gl, { data: 0 }), po = Et(Kg), Pg = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Jg = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Fg = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function $g(e) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(e) : (e = Fg[e]) ? !!t[e] : !1;
  }
  function iu() {
    return $g;
  }
  var Wg = w({}, Ba, {
    key: function(e) {
      if (e.key) {
        var t = Pg[e.key] || e.key;
        if (t !== "Unidentified") return t;
      }
      return e.type === "keypress" ? (e = Wi(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Jg[e.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: iu,
    charCode: function(e) {
      return e.type === "keypress" ? Wi(e) : 0;
    },
    keyCode: function(e) {
      return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    },
    which: function(e) {
      return e.type === "keypress" ? Wi(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    }
  }), kg = Et(Wg), Ig = w({}, er, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), yo = Et(Ig), e0 = w({}, Ba, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: iu
  }), t0 = Et(e0), n0 = w({}, gl, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), l0 = Et(n0), a0 = w({}, er, {
    deltaX: function(e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function(e) {
      return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), i0 = Et(a0), r0 = w({}, gl, {
    newState: 0,
    oldState: 0
  }), s0 = Et(r0), u0 = [9, 13, 27, 32], ru = bn && "CompositionEvent" in window, Ca = null;
  bn && "documentMode" in document && (Ca = document.documentMode);
  var c0 = bn && "TextEvent" in window && !Ca, go = bn && (!ru || Ca && 8 < Ca && 11 >= Ca), vo = " ", So = !1;
  function bo(e, t) {
    switch (e) {
      case "keyup":
        return u0.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function Eo(e) {
    return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
  }
  var Kl = !1;
  function f0(e, t) {
    switch (e) {
      case "compositionend":
        return Eo(t);
      case "keypress":
        return t.which !== 32 ? null : (So = !0, vo);
      case "textInput":
        return e = t.data, e === vo && So ? null : e;
      default:
        return null;
    }
  }
  function o0(e, t) {
    if (Kl)
      return e === "compositionend" || !ru && bo(e, t) ? (e = oo(), $i = tu = Xn = null, Kl = !1, e) : null;
    switch (e) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
          if (t.char && 1 < t.char.length)
            return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return go && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var d0 = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function wo(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === "input" ? !!d0[e.type] : t === "textarea";
  }
  function Ao(e, t, n, a) {
    Zl ? Vl ? Vl.push(a) : Vl = [a] : Zl = a, t = Gr(t, "onChange"), 0 < t.length && (n = new Ii(
      "onChange",
      "change",
      null,
      n,
      a
    ), e.push({ event: n, listeners: t }));
  }
  var La = null, Xa = null;
  function h0(e) {
    im(e, 0);
  }
  function tr(e) {
    var t = qa(e);
    if (lo(t)) return e;
  }
  function Oo(e, t) {
    if (e === "change") return t;
  }
  var Ro = !1;
  if (bn) {
    var su;
    if (bn) {
      var uu = "oninput" in document;
      if (!uu) {
        var zo = document.createElement("div");
        zo.setAttribute("oninput", "return;"), uu = typeof zo.oninput == "function";
      }
      su = uu;
    } else su = !1;
    Ro = su && (!document.documentMode || 9 < document.documentMode);
  }
  function Do() {
    La && (La.detachEvent("onpropertychange", Mo), Xa = La = null);
  }
  function Mo(e) {
    if (e.propertyName === "value" && tr(Xa)) {
      var t = [];
      Ao(
        t,
        Xa,
        e,
        ks(e)
      ), fo(h0, t);
    }
  }
  function m0(e, t, n) {
    e === "focusin" ? (Do(), La = t, Xa = n, La.attachEvent("onpropertychange", Mo)) : e === "focusout" && Do();
  }
  function p0(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown")
      return tr(Xa);
  }
  function y0(e, t) {
    if (e === "click") return tr(t);
  }
  function g0(e, t) {
    if (e === "input" || e === "change")
      return tr(t);
  }
  function v0(e, t) {
    return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
  }
  var qt = typeof Object.is == "function" ? Object.is : v0;
  function Ya(e, t) {
    if (qt(e, t)) return !0;
    if (typeof e != "object" || e === null || typeof t != "object" || t === null)
      return !1;
    var n = Object.keys(e), a = Object.keys(t);
    if (n.length !== a.length) return !1;
    for (a = 0; a < n.length; a++) {
      var r = n[a];
      if (!W.call(t, r) || !qt(e[r], t[r]))
        return !1;
    }
    return !0;
  }
  function To(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function Uo(e, t) {
    var n = To(e);
    e = 0;
    for (var a; n; ) {
      if (n.nodeType === 3) {
        if (a = e + n.textContent.length, e <= t && a >= t)
          return { node: n, offset: t - e };
        e = a;
      }
      e: {
        for (; n; ) {
          if (n.nextSibling) {
            n = n.nextSibling;
            break e;
          }
          n = n.parentNode;
        }
        n = void 0;
      }
      n = To(n);
    }
  }
  function No(e, t) {
    return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? No(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function xo(e) {
    e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
    for (var t = Ji(e.document); t instanceof e.HTMLIFrameElement; ) {
      try {
        var n = typeof t.contentWindow.location.href == "string";
      } catch {
        n = !1;
      }
      if (n) e = t.contentWindow;
      else break;
      t = Ji(e.document);
    }
    return t;
  }
  function cu(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
  }
  var S0 = bn && "documentMode" in document && 11 >= document.documentMode, Pl = null, fu = null, Qa = null, ou = !1;
  function qo(e, t, n) {
    var a = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
    ou || Pl == null || Pl !== Ji(a) || (a = Pl, "selectionStart" in a && cu(a) ? a = { start: a.selectionStart, end: a.selectionEnd } : (a = (a.ownerDocument && a.ownerDocument.defaultView || window).getSelection(), a = {
      anchorNode: a.anchorNode,
      anchorOffset: a.anchorOffset,
      focusNode: a.focusNode,
      focusOffset: a.focusOffset
    }), Qa && Ya(Qa, a) || (Qa = a, a = Gr(fu, "onSelect"), 0 < a.length && (t = new Ii(
      "onSelect",
      "select",
      null,
      t,
      n
    ), e.push({ event: t, listeners: a }), t.target = Pl)));
  }
  function vl(e, t) {
    var n = {};
    return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
  }
  var Jl = {
    animationend: vl("Animation", "AnimationEnd"),
    animationiteration: vl("Animation", "AnimationIteration"),
    animationstart: vl("Animation", "AnimationStart"),
    transitionrun: vl("Transition", "TransitionRun"),
    transitionstart: vl("Transition", "TransitionStart"),
    transitioncancel: vl("Transition", "TransitionCancel"),
    transitionend: vl("Transition", "TransitionEnd")
  }, du = {}, jo = {};
  bn && (jo = document.createElement("div").style, "AnimationEvent" in window || (delete Jl.animationend.animation, delete Jl.animationiteration.animation, delete Jl.animationstart.animation), "TransitionEvent" in window || delete Jl.transitionend.transition);
  function Sl(e) {
    if (du[e]) return du[e];
    if (!Jl[e]) return e;
    var t = Jl[e], n;
    for (n in t)
      if (t.hasOwnProperty(n) && n in jo)
        return du[e] = t[n];
    return e;
  }
  var Ho = Sl("animationend"), Bo = Sl("animationiteration"), _o = Sl("animationstart"), b0 = Sl("transitionrun"), E0 = Sl("transitionstart"), w0 = Sl("transitioncancel"), Co = Sl("transitionend"), Lo = /* @__PURE__ */ new Map(), hu = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  hu.push("scrollEnd");
  function nn(e, t) {
    Lo.set(e, t), yl(t, [e]);
  }
  var nr = typeof reportError == "function" ? reportError : function(e) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var t = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof e == "object" && e !== null && typeof e.message == "string" ? String(e.message) : String(e),
        error: e
      });
      if (!window.dispatchEvent(t)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", e);
      return;
    }
    console.error(e);
  }, Vt = [], Fl = 0, mu = 0;
  function lr() {
    for (var e = Fl, t = mu = Fl = 0; t < e; ) {
      var n = Vt[t];
      Vt[t++] = null;
      var a = Vt[t];
      Vt[t++] = null;
      var r = Vt[t];
      Vt[t++] = null;
      var u = Vt[t];
      if (Vt[t++] = null, a !== null && r !== null) {
        var f = a.pending;
        f === null ? r.next = r : (r.next = f.next, f.next = r), a.pending = r;
      }
      u !== 0 && Xo(n, r, u);
    }
  }
  function ar(e, t, n, a) {
    Vt[Fl++] = e, Vt[Fl++] = t, Vt[Fl++] = n, Vt[Fl++] = a, mu |= a, e.lanes |= a, e = e.alternate, e !== null && (e.lanes |= a);
  }
  function pu(e, t, n, a) {
    return ar(e, t, n, a), ir(e);
  }
  function bl(e, t) {
    return ar(e, null, null, t), ir(e);
  }
  function Xo(e, t, n) {
    e.lanes |= n;
    var a = e.alternate;
    a !== null && (a.lanes |= n);
    for (var r = !1, u = e.return; u !== null; )
      u.childLanes |= n, a = u.alternate, a !== null && (a.childLanes |= n), u.tag === 22 && (e = u.stateNode, e === null || e._visibility & 1 || (r = !0)), e = u, u = u.return;
    return e.tag === 3 ? (u = e.stateNode, r && t !== null && (r = 31 - xt(n), e = u.hiddenUpdates, a = e[r], a === null ? e[r] = [t] : a.push(t), t.lane = n | 536870912), u) : null;
  }
  function ir(e) {
    if (50 < fi)
      throw fi = 0, Oc = null, Error(c(185));
    for (var t = e.return; t !== null; )
      e = t, t = e.return;
    return e.tag === 3 ? e.stateNode : null;
  }
  var $l = {};
  function A0(e, t, n, a) {
    this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = a, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function jt(e, t, n, a) {
    return new A0(e, t, n, a);
  }
  function yu(e) {
    return e = e.prototype, !(!e || !e.isReactComponent);
  }
  function En(e, t) {
    var n = e.alternate;
    return n === null ? (n = jt(
      e.tag,
      t,
      e.key,
      e.mode
    ), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 65011712, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
  }
  function Yo(e, t) {
    e.flags &= 65011714;
    var n = e.alternate;
    return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), e;
  }
  function rr(e, t, n, a, r, u) {
    var f = 0;
    if (a = e, typeof e == "function") yu(e) && (f = 1);
    else if (typeof e == "string")
      f = Mv(
        e,
        n,
        ae.current
      ) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
    else
      e: switch (e) {
        case ue:
          return e = jt(31, n, t, r), e.elementType = ue, e.lanes = u, e;
        case Z:
          return El(n.children, r, u, t);
        case oe:
          f = 8, r |= 24;
          break;
        case C:
          return e = jt(12, n, t, r | 2), e.elementType = C, e.lanes = u, e;
        case Be:
          return e = jt(13, n, t, r), e.elementType = Be, e.lanes = u, e;
        case K:
          return e = jt(19, n, t, r), e.elementType = K, e.lanes = u, e;
        default:
          if (typeof e == "object" && e !== null)
            switch (e.$$typeof) {
              case me:
                f = 10;
                break e;
              case ce:
                f = 9;
                break e;
              case fe:
                f = 11;
                break e;
              case I:
                f = 14;
                break e;
              case ne:
                f = 16, a = null;
                break e;
            }
          f = 29, n = Error(
            c(130, e === null ? "null" : typeof e, "")
          ), a = null;
      }
    return t = jt(f, n, t, r), t.elementType = e, t.type = a, t.lanes = u, t;
  }
  function El(e, t, n, a) {
    return e = jt(7, e, a, t), e.lanes = n, e;
  }
  function gu(e, t, n) {
    return e = jt(6, e, null, t), e.lanes = n, e;
  }
  function Qo(e) {
    var t = jt(18, null, null, 0);
    return t.stateNode = e, t;
  }
  function vu(e, t, n) {
    return t = jt(
      4,
      e.children !== null ? e.children : [],
      e.key,
      t
    ), t.lanes = n, t.stateNode = {
      containerInfo: e.containerInfo,
      pendingChildren: null,
      implementation: e.implementation
    }, t;
  }
  var Go = /* @__PURE__ */ new WeakMap();
  function Kt(e, t) {
    if (typeof e == "object" && e !== null) {
      var n = Go.get(e);
      return n !== void 0 ? n : (t = {
        value: e,
        source: t,
        stack: ge(t)
      }, Go.set(e, t), t);
    }
    return {
      value: e,
      source: t,
      stack: ge(t)
    };
  }
  var Wl = [], kl = 0, sr = null, Ga = 0, Pt = [], Jt = 0, Yn = null, cn = 1, fn = "";
  function wn(e, t) {
    Wl[kl++] = Ga, Wl[kl++] = sr, sr = e, Ga = t;
  }
  function Zo(e, t, n) {
    Pt[Jt++] = cn, Pt[Jt++] = fn, Pt[Jt++] = Yn, Yn = e;
    var a = cn;
    e = fn;
    var r = 32 - xt(a) - 1;
    a &= ~(1 << r), n += 1;
    var u = 32 - xt(t) + r;
    if (30 < u) {
      var f = r - r % 5;
      u = (a & (1 << f) - 1).toString(32), a >>= f, r -= f, cn = 1 << 32 - xt(t) + r | n << r | a, fn = u + e;
    } else
      cn = 1 << u | n << r | a, fn = e;
  }
  function Su(e) {
    e.return !== null && (wn(e, 1), Zo(e, 1, 0));
  }
  function bu(e) {
    for (; e === sr; )
      sr = Wl[--kl], Wl[kl] = null, Ga = Wl[--kl], Wl[kl] = null;
    for (; e === Yn; )
      Yn = Pt[--Jt], Pt[Jt] = null, fn = Pt[--Jt], Pt[Jt] = null, cn = Pt[--Jt], Pt[Jt] = null;
  }
  function Vo(e, t) {
    Pt[Jt++] = cn, Pt[Jt++] = fn, Pt[Jt++] = Yn, cn = t.id, fn = t.overflow, Yn = e;
  }
  var ct = null, je = null, ve = !1, Qn = null, Ft = !1, Eu = Error(c(519));
  function Gn(e) {
    var t = Error(
      c(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Za(Kt(t, e)), Eu;
  }
  function Ko(e) {
    var t = e.stateNode, n = e.type, a = e.memoizedProps;
    switch (t[ut] = e, t[bt] = a, n) {
      case "dialog":
        he("cancel", t), he("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        he("load", t);
        break;
      case "video":
      case "audio":
        for (n = 0; n < di.length; n++)
          he(di[n], t);
        break;
      case "source":
        he("error", t);
        break;
      case "img":
      case "image":
      case "link":
        he("error", t), he("load", t);
        break;
      case "details":
        he("toggle", t);
        break;
      case "input":
        he("invalid", t), ao(
          t,
          a.value,
          a.defaultValue,
          a.checked,
          a.defaultChecked,
          a.type,
          a.name,
          !0
        );
        break;
      case "select":
        he("invalid", t);
        break;
      case "textarea":
        he("invalid", t), ro(t, a.value, a.defaultValue, a.children);
    }
    n = a.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || a.suppressHydrationWarning === !0 || cm(t.textContent, n) ? (a.popover != null && (he("beforetoggle", t), he("toggle", t)), a.onScroll != null && he("scroll", t), a.onScrollEnd != null && he("scrollend", t), a.onClick != null && (t.onclick = Sn), t = !0) : t = !1, t || Gn(e, !0);
  }
  function Po(e) {
    for (ct = e.return; ct; )
      switch (ct.tag) {
        case 5:
        case 31:
        case 13:
          Ft = !1;
          return;
        case 27:
        case 3:
          Ft = !0;
          return;
        default:
          ct = ct.return;
      }
  }
  function Il(e) {
    if (e !== ct) return !1;
    if (!ve) return Po(e), ve = !0, !1;
    var t = e.tag, n;
    if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = !(n !== "form" && n !== "button") || Lc(e.type, e.memoizedProps)), n = !n), n && je && Gn(e), Po(e), t === 13) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(c(317));
      je = vm(e);
    } else if (t === 31) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(c(317));
      je = vm(e);
    } else
      t === 27 ? (t = je, ll(e.type) ? (e = Zc, Zc = null, je = e) : je = t) : je = ct ? Wt(e.stateNode.nextSibling) : null;
    return !0;
  }
  function wl() {
    je = ct = null, ve = !1;
  }
  function wu() {
    var e = Qn;
    return e !== null && (Rt === null ? Rt = e : Rt.push.apply(
      Rt,
      e
    ), Qn = null), e;
  }
  function Za(e) {
    Qn === null ? Qn = [e] : Qn.push(e);
  }
  var Au = Ee(null), Al = null, An = null;
  function Zn(e, t, n) {
    ee(Au, t._currentValue), t._currentValue = n;
  }
  function On(e) {
    e._currentValue = Au.current, J(Au);
  }
  function Ou(e, t, n) {
    for (; e !== null; ) {
      var a = e.alternate;
      if ((e.childLanes & t) !== t ? (e.childLanes |= t, a !== null && (a.childLanes |= t)) : a !== null && (a.childLanes & t) !== t && (a.childLanes |= t), e === n) break;
      e = e.return;
    }
  }
  function Ru(e, t, n, a) {
    var r = e.child;
    for (r !== null && (r.return = e); r !== null; ) {
      var u = r.dependencies;
      if (u !== null) {
        var f = r.child;
        u = u.firstContext;
        e: for (; u !== null; ) {
          var h = u;
          u = r;
          for (var y = 0; y < t.length; y++)
            if (h.context === t[y]) {
              u.lanes |= n, h = u.alternate, h !== null && (h.lanes |= n), Ou(
                u.return,
                n,
                e
              ), a || (f = null);
              break e;
            }
          u = h.next;
        }
      } else if (r.tag === 18) {
        if (f = r.return, f === null) throw Error(c(341));
        f.lanes |= n, u = f.alternate, u !== null && (u.lanes |= n), Ou(f, n, e), f = null;
      } else f = r.child;
      if (f !== null) f.return = r;
      else
        for (f = r; f !== null; ) {
          if (f === e) {
            f = null;
            break;
          }
          if (r = f.sibling, r !== null) {
            r.return = f.return, f = r;
            break;
          }
          f = f.return;
        }
      r = f;
    }
  }
  function ea(e, t, n, a) {
    e = null;
    for (var r = t, u = !1; r !== null; ) {
      if (!u) {
        if ((r.flags & 524288) !== 0) u = !0;
        else if ((r.flags & 262144) !== 0) break;
      }
      if (r.tag === 10) {
        var f = r.alternate;
        if (f === null) throw Error(c(387));
        if (f = f.memoizedProps, f !== null) {
          var h = r.type;
          qt(r.pendingProps.value, f.value) || (e !== null ? e.push(h) : e = [h]);
        }
      } else if (r === ht.current) {
        if (f = r.alternate, f === null) throw Error(c(387));
        f.memoizedState.memoizedState !== r.memoizedState.memoizedState && (e !== null ? e.push(gi) : e = [gi]);
      }
      r = r.return;
    }
    e !== null && Ru(
      t,
      e,
      n,
      a
    ), t.flags |= 262144;
  }
  function ur(e) {
    for (e = e.firstContext; e !== null; ) {
      if (!qt(
        e.context._currentValue,
        e.memoizedValue
      ))
        return !0;
      e = e.next;
    }
    return !1;
  }
  function Ol(e) {
    Al = e, An = null, e = e.dependencies, e !== null && (e.firstContext = null);
  }
  function ft(e) {
    return Jo(Al, e);
  }
  function cr(e, t) {
    return Al === null && Ol(e), Jo(e, t);
  }
  function Jo(e, t) {
    var n = t._currentValue;
    if (t = { context: t, memoizedValue: n, next: null }, An === null) {
      if (e === null) throw Error(c(308));
      An = t, e.dependencies = { lanes: 0, firstContext: t }, e.flags |= 524288;
    } else An = An.next = t;
    return n;
  }
  var O0 = typeof AbortController < "u" ? AbortController : function() {
    var e = [], t = this.signal = {
      aborted: !1,
      addEventListener: function(n, a) {
        e.push(a);
      }
    };
    this.abort = function() {
      t.aborted = !0, e.forEach(function(n) {
        return n();
      });
    };
  }, R0 = l.unstable_scheduleCallback, z0 = l.unstable_NormalPriority, $e = {
    $$typeof: me,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function zu() {
    return {
      controller: new O0(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Va(e) {
    e.refCount--, e.refCount === 0 && R0(z0, function() {
      e.controller.abort();
    });
  }
  var Ka = null, Du = 0, ta = 0, na = null;
  function D0(e, t) {
    if (Ka === null) {
      var n = Ka = [];
      Du = 0, ta = Uc(), na = {
        status: "pending",
        value: void 0,
        then: function(a) {
          n.push(a);
        }
      };
    }
    return Du++, t.then(Fo, Fo), t;
  }
  function Fo() {
    if (--Du === 0 && Ka !== null) {
      na !== null && (na.status = "fulfilled");
      var e = Ka;
      Ka = null, ta = 0, na = null;
      for (var t = 0; t < e.length; t++) (0, e[t])();
    }
  }
  function M0(e, t) {
    var n = [], a = {
      status: "pending",
      value: null,
      reason: null,
      then: function(r) {
        n.push(r);
      }
    };
    return e.then(
      function() {
        a.status = "fulfilled", a.value = t;
        for (var r = 0; r < n.length; r++) (0, n[r])(t);
      },
      function(r) {
        for (a.status = "rejected", a.reason = r, r = 0; r < n.length; r++)
          (0, n[r])(void 0);
      }
    ), a;
  }
  var $o = b.S;
  b.S = function(e, t) {
    qh = st(), typeof t == "object" && t !== null && typeof t.then == "function" && D0(e, t), $o !== null && $o(e, t);
  };
  var Rl = Ee(null);
  function Mu() {
    var e = Rl.current;
    return e !== null ? e : xe.pooledCache;
  }
  function fr(e, t) {
    t === null ? ee(Rl, Rl.current) : ee(Rl, t.pool);
  }
  function Wo() {
    var e = Mu();
    return e === null ? null : { parent: $e._currentValue, pool: e };
  }
  var la = Error(c(460)), Tu = Error(c(474)), or = Error(c(542)), dr = { then: function() {
  } };
  function ko(e) {
    return e = e.status, e === "fulfilled" || e === "rejected";
  }
  function Io(e, t, n) {
    switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(Sn, Sn), t = n), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw e = t.reason, td(e), e;
      default:
        if (typeof t.status == "string") t.then(Sn, Sn);
        else {
          if (e = xe, e !== null && 100 < e.shellSuspendCounter)
            throw Error(c(482));
          e = t, e.status = "pending", e.then(
            function(a) {
              if (t.status === "pending") {
                var r = t;
                r.status = "fulfilled", r.value = a;
              }
            },
            function(a) {
              if (t.status === "pending") {
                var r = t;
                r.status = "rejected", r.reason = a;
              }
            }
          );
        }
        switch (t.status) {
          case "fulfilled":
            return t.value;
          case "rejected":
            throw e = t.reason, td(e), e;
        }
        throw Dl = t, la;
    }
  }
  function zl(e) {
    try {
      var t = e._init;
      return t(e._payload);
    } catch (n) {
      throw n !== null && typeof n == "object" && typeof n.then == "function" ? (Dl = n, la) : n;
    }
  }
  var Dl = null;
  function ed() {
    if (Dl === null) throw Error(c(459));
    var e = Dl;
    return Dl = null, e;
  }
  function td(e) {
    if (e === la || e === or)
      throw Error(c(483));
  }
  var aa = null, Pa = 0;
  function hr(e) {
    var t = Pa;
    return Pa += 1, aa === null && (aa = []), Io(aa, e, t);
  }
  function Ja(e, t) {
    t = t.props.ref, e.ref = t !== void 0 ? t : null;
  }
  function mr(e, t) {
    throw t.$$typeof === N ? Error(c(525)) : (e = Object.prototype.toString.call(t), Error(
      c(
        31,
        e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e
      )
    ));
  }
  function nd(e) {
    function t(E, v) {
      if (e) {
        var O = E.deletions;
        O === null ? (E.deletions = [v], E.flags |= 16) : O.push(v);
      }
    }
    function n(E, v) {
      if (!e) return null;
      for (; v !== null; )
        t(E, v), v = v.sibling;
      return null;
    }
    function a(E) {
      for (var v = /* @__PURE__ */ new Map(); E !== null; )
        E.key !== null ? v.set(E.key, E) : v.set(E.index, E), E = E.sibling;
      return v;
    }
    function r(E, v) {
      return E = En(E, v), E.index = 0, E.sibling = null, E;
    }
    function u(E, v, O) {
      return E.index = O, e ? (O = E.alternate, O !== null ? (O = O.index, O < v ? (E.flags |= 67108866, v) : O) : (E.flags |= 67108866, v)) : (E.flags |= 1048576, v);
    }
    function f(E) {
      return e && E.alternate === null && (E.flags |= 67108866), E;
    }
    function h(E, v, O, T) {
      return v === null || v.tag !== 6 ? (v = gu(O, E.mode, T), v.return = E, v) : (v = r(v, O), v.return = E, v);
    }
    function y(E, v, O, T) {
      var F = O.type;
      return F === Z ? M(
        E,
        v,
        O.props.children,
        T,
        O.key
      ) : v !== null && (v.elementType === F || typeof F == "object" && F !== null && F.$$typeof === ne && zl(F) === v.type) ? (v = r(v, O.props), Ja(v, O), v.return = E, v) : (v = rr(
        O.type,
        O.key,
        O.props,
        null,
        E.mode,
        T
      ), Ja(v, O), v.return = E, v);
    }
    function R(E, v, O, T) {
      return v === null || v.tag !== 4 || v.stateNode.containerInfo !== O.containerInfo || v.stateNode.implementation !== O.implementation ? (v = vu(O, E.mode, T), v.return = E, v) : (v = r(v, O.children || []), v.return = E, v);
    }
    function M(E, v, O, T, F) {
      return v === null || v.tag !== 7 ? (v = El(
        O,
        E.mode,
        T,
        F
      ), v.return = E, v) : (v = r(v, O), v.return = E, v);
    }
    function U(E, v, O) {
      if (typeof v == "string" && v !== "" || typeof v == "number" || typeof v == "bigint")
        return v = gu(
          "" + v,
          E.mode,
          O
        ), v.return = E, v;
      if (typeof v == "object" && v !== null) {
        switch (v.$$typeof) {
          case _:
            return O = rr(
              v.type,
              v.key,
              v.props,
              null,
              E.mode,
              O
            ), Ja(O, v), O.return = E, O;
          case B:
            return v = vu(
              v,
              E.mode,
              O
            ), v.return = E, v;
          case ne:
            return v = zl(v), U(E, v, O);
        }
        if (be(v) || H(v))
          return v = El(
            v,
            E.mode,
            O,
            null
          ), v.return = E, v;
        if (typeof v.then == "function")
          return U(E, hr(v), O);
        if (v.$$typeof === me)
          return U(
            E,
            cr(E, v),
            O
          );
        mr(E, v);
      }
      return null;
    }
    function z(E, v, O, T) {
      var F = v !== null ? v.key : null;
      if (typeof O == "string" && O !== "" || typeof O == "number" || typeof O == "bigint")
        return F !== null ? null : h(E, v, "" + O, T);
      if (typeof O == "object" && O !== null) {
        switch (O.$$typeof) {
          case _:
            return O.key === F ? y(E, v, O, T) : null;
          case B:
            return O.key === F ? R(E, v, O, T) : null;
          case ne:
            return O = zl(O), z(E, v, O, T);
        }
        if (be(O) || H(O))
          return F !== null ? null : M(E, v, O, T, null);
        if (typeof O.then == "function")
          return z(
            E,
            v,
            hr(O),
            T
          );
        if (O.$$typeof === me)
          return z(
            E,
            v,
            cr(E, O),
            T
          );
        mr(E, O);
      }
      return null;
    }
    function D(E, v, O, T, F) {
      if (typeof T == "string" && T !== "" || typeof T == "number" || typeof T == "bigint")
        return E = E.get(O) || null, h(v, E, "" + T, F);
      if (typeof T == "object" && T !== null) {
        switch (T.$$typeof) {
          case _:
            return E = E.get(
              T.key === null ? O : T.key
            ) || null, y(v, E, T, F);
          case B:
            return E = E.get(
              T.key === null ? O : T.key
            ) || null, R(v, E, T, F);
          case ne:
            return T = zl(T), D(
              E,
              v,
              O,
              T,
              F
            );
        }
        if (be(T) || H(T))
          return E = E.get(O) || null, M(v, E, T, F, null);
        if (typeof T.then == "function")
          return D(
            E,
            v,
            O,
            hr(T),
            F
          );
        if (T.$$typeof === me)
          return D(
            E,
            v,
            O,
            cr(v, T),
            F
          );
        mr(v, T);
      }
      return null;
    }
    function X(E, v, O, T) {
      for (var F = null, Ae = null, G = v, se = v = 0, ye = null; G !== null && se < O.length; se++) {
        G.index > se ? (ye = G, G = null) : ye = G.sibling;
        var Oe = z(
          E,
          G,
          O[se],
          T
        );
        if (Oe === null) {
          G === null && (G = ye);
          break;
        }
        e && G && Oe.alternate === null && t(E, G), v = u(Oe, v, se), Ae === null ? F = Oe : Ae.sibling = Oe, Ae = Oe, G = ye;
      }
      if (se === O.length)
        return n(E, G), ve && wn(E, se), F;
      if (G === null) {
        for (; se < O.length; se++)
          G = U(E, O[se], T), G !== null && (v = u(
            G,
            v,
            se
          ), Ae === null ? F = G : Ae.sibling = G, Ae = G);
        return ve && wn(E, se), F;
      }
      for (G = a(G); se < O.length; se++)
        ye = D(
          G,
          E,
          se,
          O[se],
          T
        ), ye !== null && (e && ye.alternate !== null && G.delete(
          ye.key === null ? se : ye.key
        ), v = u(
          ye,
          v,
          se
        ), Ae === null ? F = ye : Ae.sibling = ye, Ae = ye);
      return e && G.forEach(function(ul) {
        return t(E, ul);
      }), ve && wn(E, se), F;
    }
    function k(E, v, O, T) {
      if (O == null) throw Error(c(151));
      for (var F = null, Ae = null, G = v, se = v = 0, ye = null, Oe = O.next(); G !== null && !Oe.done; se++, Oe = O.next()) {
        G.index > se ? (ye = G, G = null) : ye = G.sibling;
        var ul = z(E, G, Oe.value, T);
        if (ul === null) {
          G === null && (G = ye);
          break;
        }
        e && G && ul.alternate === null && t(E, G), v = u(ul, v, se), Ae === null ? F = ul : Ae.sibling = ul, Ae = ul, G = ye;
      }
      if (Oe.done)
        return n(E, G), ve && wn(E, se), F;
      if (G === null) {
        for (; !Oe.done; se++, Oe = O.next())
          Oe = U(E, Oe.value, T), Oe !== null && (v = u(Oe, v, se), Ae === null ? F = Oe : Ae.sibling = Oe, Ae = Oe);
        return ve && wn(E, se), F;
      }
      for (G = a(G); !Oe.done; se++, Oe = O.next())
        Oe = D(G, E, se, Oe.value, T), Oe !== null && (e && Oe.alternate !== null && G.delete(Oe.key === null ? se : Oe.key), v = u(Oe, v, se), Ae === null ? F = Oe : Ae.sibling = Oe, Ae = Oe);
      return e && G.forEach(function(Lv) {
        return t(E, Lv);
      }), ve && wn(E, se), F;
    }
    function Ue(E, v, O, T) {
      if (typeof O == "object" && O !== null && O.type === Z && O.key === null && (O = O.props.children), typeof O == "object" && O !== null) {
        switch (O.$$typeof) {
          case _:
            e: {
              for (var F = O.key; v !== null; ) {
                if (v.key === F) {
                  if (F = O.type, F === Z) {
                    if (v.tag === 7) {
                      n(
                        E,
                        v.sibling
                      ), T = r(
                        v,
                        O.props.children
                      ), T.return = E, E = T;
                      break e;
                    }
                  } else if (v.elementType === F || typeof F == "object" && F !== null && F.$$typeof === ne && zl(F) === v.type) {
                    n(
                      E,
                      v.sibling
                    ), T = r(v, O.props), Ja(T, O), T.return = E, E = T;
                    break e;
                  }
                  n(E, v);
                  break;
                } else t(E, v);
                v = v.sibling;
              }
              O.type === Z ? (T = El(
                O.props.children,
                E.mode,
                T,
                O.key
              ), T.return = E, E = T) : (T = rr(
                O.type,
                O.key,
                O.props,
                null,
                E.mode,
                T
              ), Ja(T, O), T.return = E, E = T);
            }
            return f(E);
          case B:
            e: {
              for (F = O.key; v !== null; ) {
                if (v.key === F)
                  if (v.tag === 4 && v.stateNode.containerInfo === O.containerInfo && v.stateNode.implementation === O.implementation) {
                    n(
                      E,
                      v.sibling
                    ), T = r(v, O.children || []), T.return = E, E = T;
                    break e;
                  } else {
                    n(E, v);
                    break;
                  }
                else t(E, v);
                v = v.sibling;
              }
              T = vu(O, E.mode, T), T.return = E, E = T;
            }
            return f(E);
          case ne:
            return O = zl(O), Ue(
              E,
              v,
              O,
              T
            );
        }
        if (be(O))
          return X(
            E,
            v,
            O,
            T
          );
        if (H(O)) {
          if (F = H(O), typeof F != "function") throw Error(c(150));
          return O = F.call(O), k(
            E,
            v,
            O,
            T
          );
        }
        if (typeof O.then == "function")
          return Ue(
            E,
            v,
            hr(O),
            T
          );
        if (O.$$typeof === me)
          return Ue(
            E,
            v,
            cr(E, O),
            T
          );
        mr(E, O);
      }
      return typeof O == "string" && O !== "" || typeof O == "number" || typeof O == "bigint" ? (O = "" + O, v !== null && v.tag === 6 ? (n(E, v.sibling), T = r(v, O), T.return = E, E = T) : (n(E, v), T = gu(O, E.mode, T), T.return = E, E = T), f(E)) : n(E, v);
    }
    return function(E, v, O, T) {
      try {
        Pa = 0;
        var F = Ue(
          E,
          v,
          O,
          T
        );
        return aa = null, F;
      } catch (G) {
        if (G === la || G === or) throw G;
        var Ae = jt(29, G, null, E.mode);
        return Ae.lanes = T, Ae.return = E, Ae;
      }
    };
  }
  var Ml = nd(!0), ld = nd(!1), Vn = !1;
  function Uu(e) {
    e.updateQueue = {
      baseState: e.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Nu(e, t) {
    e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
      baseState: e.baseState,
      firstBaseUpdate: e.firstBaseUpdate,
      lastBaseUpdate: e.lastBaseUpdate,
      shared: e.shared,
      callbacks: null
    });
  }
  function Kn(e) {
    return { lane: e, tag: 0, payload: null, callback: null, next: null };
  }
  function Pn(e, t, n) {
    var a = e.updateQueue;
    if (a === null) return null;
    if (a = a.shared, (Re & 2) !== 0) {
      var r = a.pending;
      return r === null ? t.next = t : (t.next = r.next, r.next = t), a.pending = t, t = ir(e), Xo(e, null, n), t;
    }
    return ar(e, a, t, n), ir(e);
  }
  function Fa(e, t, n) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194048) !== 0)) {
      var a = t.lanes;
      a &= e.pendingLanes, n |= a, t.lanes = n, Pf(e, n);
    }
  }
  function xu(e, t) {
    var n = e.updateQueue, a = e.alternate;
    if (a !== null && (a = a.updateQueue, n === a)) {
      var r = null, u = null;
      if (n = n.firstBaseUpdate, n !== null) {
        do {
          var f = {
            lane: n.lane,
            tag: n.tag,
            payload: n.payload,
            callback: null,
            next: null
          };
          u === null ? r = u = f : u = u.next = f, n = n.next;
        } while (n !== null);
        u === null ? r = u = t : u = u.next = t;
      } else r = u = t;
      n = {
        baseState: a.baseState,
        firstBaseUpdate: r,
        lastBaseUpdate: u,
        shared: a.shared,
        callbacks: a.callbacks
      }, e.updateQueue = n;
      return;
    }
    e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
  }
  var qu = !1;
  function $a() {
    if (qu) {
      var e = na;
      if (e !== null) throw e;
    }
  }
  function Wa(e, t, n, a) {
    qu = !1;
    var r = e.updateQueue;
    Vn = !1;
    var u = r.firstBaseUpdate, f = r.lastBaseUpdate, h = r.shared.pending;
    if (h !== null) {
      r.shared.pending = null;
      var y = h, R = y.next;
      y.next = null, f === null ? u = R : f.next = R, f = y;
      var M = e.alternate;
      M !== null && (M = M.updateQueue, h = M.lastBaseUpdate, h !== f && (h === null ? M.firstBaseUpdate = R : h.next = R, M.lastBaseUpdate = y));
    }
    if (u !== null) {
      var U = r.baseState;
      f = 0, M = R = y = null, h = u;
      do {
        var z = h.lane & -536870913, D = z !== h.lane;
        if (D ? (pe & z) === z : (a & z) === z) {
          z !== 0 && z === ta && (qu = !0), M !== null && (M = M.next = {
            lane: 0,
            tag: h.tag,
            payload: h.payload,
            callback: null,
            next: null
          });
          e: {
            var X = e, k = h;
            z = t;
            var Ue = n;
            switch (k.tag) {
              case 1:
                if (X = k.payload, typeof X == "function") {
                  U = X.call(Ue, U, z);
                  break e;
                }
                U = X;
                break e;
              case 3:
                X.flags = X.flags & -65537 | 128;
              case 0:
                if (X = k.payload, z = typeof X == "function" ? X.call(Ue, U, z) : X, z == null) break e;
                U = w({}, U, z);
                break e;
              case 2:
                Vn = !0;
            }
          }
          z = h.callback, z !== null && (e.flags |= 64, D && (e.flags |= 8192), D = r.callbacks, D === null ? r.callbacks = [z] : D.push(z));
        } else
          D = {
            lane: z,
            tag: h.tag,
            payload: h.payload,
            callback: h.callback,
            next: null
          }, M === null ? (R = M = D, y = U) : M = M.next = D, f |= z;
        if (h = h.next, h === null) {
          if (h = r.shared.pending, h === null)
            break;
          D = h, h = D.next, D.next = null, r.lastBaseUpdate = D, r.shared.pending = null;
        }
      } while (!0);
      M === null && (y = U), r.baseState = y, r.firstBaseUpdate = R, r.lastBaseUpdate = M, u === null && (r.shared.lanes = 0), kn |= f, e.lanes = f, e.memoizedState = U;
    }
  }
  function ad(e, t) {
    if (typeof e != "function")
      throw Error(c(191, e));
    e.call(t);
  }
  function id(e, t) {
    var n = e.callbacks;
    if (n !== null)
      for (e.callbacks = null, e = 0; e < n.length; e++)
        ad(n[e], t);
  }
  var ia = Ee(null), pr = Ee(0);
  function rd(e, t) {
    e = qn, ee(pr, e), ee(ia, t), qn = e | t.baseLanes;
  }
  function ju() {
    ee(pr, qn), ee(ia, ia.current);
  }
  function Hu() {
    qn = pr.current, J(ia), J(pr);
  }
  var Ht = Ee(null), $t = null;
  function Jn(e) {
    var t = e.alternate;
    ee(Ve, Ve.current & 1), ee(Ht, e), $t === null && (t === null || ia.current !== null || t.memoizedState !== null) && ($t = e);
  }
  function Bu(e) {
    ee(Ve, Ve.current), ee(Ht, e), $t === null && ($t = e);
  }
  function sd(e) {
    e.tag === 22 ? (ee(Ve, Ve.current), ee(Ht, e), $t === null && ($t = e)) : Fn();
  }
  function Fn() {
    ee(Ve, Ve.current), ee(Ht, Ht.current);
  }
  function Bt(e) {
    J(Ht), $t === e && ($t = null), J(Ve);
  }
  var Ve = Ee(0);
  function yr(e) {
    for (var t = e; t !== null; ) {
      if (t.tag === 13) {
        var n = t.memoizedState;
        if (n !== null && (n = n.dehydrated, n === null || Qc(n) || Gc(n)))
          return t;
      } else if (t.tag === 19 && (t.memoizedProps.revealOrder === "forwards" || t.memoizedProps.revealOrder === "backwards" || t.memoizedProps.revealOrder === "unstable_legacy-backwards" || t.memoizedProps.revealOrder === "together")) {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t, t = t.child;
        continue;
      }
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return null;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
    return null;
  }
  var Rn = 0, re = null, Me = null, We = null, gr = !1, ra = !1, Tl = !1, vr = 0, ka = 0, sa = null, T0 = 0;
  function Ye() {
    throw Error(c(321));
  }
  function _u(e, t) {
    if (t === null) return !1;
    for (var n = 0; n < t.length && n < e.length; n++)
      if (!qt(e[n], t[n])) return !1;
    return !0;
  }
  function Cu(e, t, n, a, r, u) {
    return Rn = u, re = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, b.H = e === null || e.memoizedState === null ? Zd : Iu, Tl = !1, u = n(a, r), Tl = !1, ra && (u = cd(
      t,
      n,
      a,
      r
    )), ud(e), u;
  }
  function ud(e) {
    b.H = ti;
    var t = Me !== null && Me.next !== null;
    if (Rn = 0, We = Me = re = null, gr = !1, ka = 0, sa = null, t) throw Error(c(300));
    e === null || ke || (e = e.dependencies, e !== null && ur(e) && (ke = !0));
  }
  function cd(e, t, n, a) {
    re = e;
    var r = 0;
    do {
      if (ra && (sa = null), ka = 0, ra = !1, 25 <= r) throw Error(c(301));
      if (r += 1, We = Me = null, e.updateQueue != null) {
        var u = e.updateQueue;
        u.lastEffect = null, u.events = null, u.stores = null, u.memoCache != null && (u.memoCache.index = 0);
      }
      b.H = Vd, u = t(n, a);
    } while (ra);
    return u;
  }
  function U0() {
    var e = b.H, t = e.useState()[0];
    return t = typeof t.then == "function" ? Ia(t) : t, e = e.useState()[0], (Me !== null ? Me.memoizedState : null) !== e && (re.flags |= 1024), t;
  }
  function Lu() {
    var e = vr !== 0;
    return vr = 0, e;
  }
  function Xu(e, t, n) {
    t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
  }
  function Yu(e) {
    if (gr) {
      for (e = e.memoizedState; e !== null; ) {
        var t = e.queue;
        t !== null && (t.pending = null), e = e.next;
      }
      gr = !1;
    }
    Rn = 0, We = Me = re = null, ra = !1, ka = vr = 0, sa = null;
  }
  function pt() {
    var e = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return We === null ? re.memoizedState = We = e : We = We.next = e, We;
  }
  function Ke() {
    if (Me === null) {
      var e = re.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = Me.next;
    var t = We === null ? re.memoizedState : We.next;
    if (t !== null)
      We = t, Me = e;
    else {
      if (e === null)
        throw re.alternate === null ? Error(c(467)) : Error(c(310));
      Me = e, e = {
        memoizedState: Me.memoizedState,
        baseState: Me.baseState,
        baseQueue: Me.baseQueue,
        queue: Me.queue,
        next: null
      }, We === null ? re.memoizedState = We = e : We = We.next = e;
    }
    return We;
  }
  function Sr() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Ia(e) {
    var t = ka;
    return ka += 1, sa === null && (sa = []), e = Io(sa, e, t), t = re, (We === null ? t.memoizedState : We.next) === null && (t = t.alternate, b.H = t === null || t.memoizedState === null ? Zd : Iu), e;
  }
  function br(e) {
    if (e !== null && typeof e == "object") {
      if (typeof e.then == "function") return Ia(e);
      if (e.$$typeof === me) return ft(e);
    }
    throw Error(c(438, String(e)));
  }
  function Qu(e) {
    var t = null, n = re.updateQueue;
    if (n !== null && (t = n.memoCache), t == null) {
      var a = re.alternate;
      a !== null && (a = a.updateQueue, a !== null && (a = a.memoCache, a != null && (t = {
        data: a.data.map(function(r) {
          return r.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), n === null && (n = Sr(), re.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0)
      for (n = t.data[t.index] = Array(e), a = 0; a < e; a++)
        n[a] = V;
    return t.index++, n;
  }
  function zn(e, t) {
    return typeof t == "function" ? t(e) : t;
  }
  function Er(e) {
    var t = Ke();
    return Gu(t, Me, e);
  }
  function Gu(e, t, n) {
    var a = e.queue;
    if (a === null) throw Error(c(311));
    a.lastRenderedReducer = n;
    var r = e.baseQueue, u = a.pending;
    if (u !== null) {
      if (r !== null) {
        var f = r.next;
        r.next = u.next, u.next = f;
      }
      t.baseQueue = r = u, a.pending = null;
    }
    if (u = e.baseState, r === null) e.memoizedState = u;
    else {
      t = r.next;
      var h = f = null, y = null, R = t, M = !1;
      do {
        var U = R.lane & -536870913;
        if (U !== R.lane ? (pe & U) === U : (Rn & U) === U) {
          var z = R.revertLane;
          if (z === 0)
            y !== null && (y = y.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: R.action,
              hasEagerState: R.hasEagerState,
              eagerState: R.eagerState,
              next: null
            }), U === ta && (M = !0);
          else if ((Rn & z) === z) {
            R = R.next, z === ta && (M = !0);
            continue;
          } else
            U = {
              lane: 0,
              revertLane: R.revertLane,
              gesture: null,
              action: R.action,
              hasEagerState: R.hasEagerState,
              eagerState: R.eagerState,
              next: null
            }, y === null ? (h = y = U, f = u) : y = y.next = U, re.lanes |= z, kn |= z;
          U = R.action, Tl && n(u, U), u = R.hasEagerState ? R.eagerState : n(u, U);
        } else
          z = {
            lane: U,
            revertLane: R.revertLane,
            gesture: R.gesture,
            action: R.action,
            hasEagerState: R.hasEagerState,
            eagerState: R.eagerState,
            next: null
          }, y === null ? (h = y = z, f = u) : y = y.next = z, re.lanes |= U, kn |= U;
        R = R.next;
      } while (R !== null && R !== t);
      if (y === null ? f = u : y.next = h, !qt(u, e.memoizedState) && (ke = !0, M && (n = na, n !== null)))
        throw n;
      e.memoizedState = u, e.baseState = f, e.baseQueue = y, a.lastRenderedState = u;
    }
    return r === null && (a.lanes = 0), [e.memoizedState, a.dispatch];
  }
  function Zu(e) {
    var t = Ke(), n = t.queue;
    if (n === null) throw Error(c(311));
    n.lastRenderedReducer = e;
    var a = n.dispatch, r = n.pending, u = t.memoizedState;
    if (r !== null) {
      n.pending = null;
      var f = r = r.next;
      do
        u = e(u, f.action), f = f.next;
      while (f !== r);
      qt(u, t.memoizedState) || (ke = !0), t.memoizedState = u, t.baseQueue === null && (t.baseState = u), n.lastRenderedState = u;
    }
    return [u, a];
  }
  function fd(e, t, n) {
    var a = re, r = Ke(), u = ve;
    if (u) {
      if (n === void 0) throw Error(c(407));
      n = n();
    } else n = t();
    var f = !qt(
      (Me || r).memoizedState,
      n
    );
    if (f && (r.memoizedState = n, ke = !0), r = r.queue, Pu(hd.bind(null, a, r, e), [
      e
    ]), r.getSnapshot !== t || f || We !== null && We.memoizedState.tag & 1) {
      if (a.flags |= 2048, ua(
        9,
        { destroy: void 0 },
        dd.bind(
          null,
          a,
          r,
          n,
          t
        ),
        null
      ), xe === null) throw Error(c(349));
      u || (Rn & 127) !== 0 || od(a, t, n);
    }
    return n;
  }
  function od(e, t, n) {
    e.flags |= 16384, e = { getSnapshot: t, value: n }, t = re.updateQueue, t === null ? (t = Sr(), re.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
  }
  function dd(e, t, n, a) {
    t.value = n, t.getSnapshot = a, md(t) && pd(e);
  }
  function hd(e, t, n) {
    return n(function() {
      md(t) && pd(e);
    });
  }
  function md(e) {
    var t = e.getSnapshot;
    e = e.value;
    try {
      var n = t();
      return !qt(e, n);
    } catch {
      return !0;
    }
  }
  function pd(e) {
    var t = bl(e, 2);
    t !== null && zt(t, e, 2);
  }
  function Vu(e) {
    var t = pt();
    if (typeof e == "function") {
      var n = e;
      if (e = n(), Tl) {
        Cn(!0);
        try {
          n();
        } finally {
          Cn(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = e, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: zn,
      lastRenderedState: e
    }, t;
  }
  function yd(e, t, n, a) {
    return e.baseState = n, Gu(
      e,
      Me,
      typeof a == "function" ? a : zn
    );
  }
  function N0(e, t, n, a, r) {
    if (Or(e)) throw Error(c(485));
    if (e = t.action, e !== null) {
      var u = {
        payload: r,
        action: e,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(f) {
          u.listeners.push(f);
        }
      };
      b.T !== null ? n(!0) : u.isTransition = !1, a(u), n = t.pending, n === null ? (u.next = t.pending = u, gd(t, u)) : (u.next = n.next, t.pending = n.next = u);
    }
  }
  function gd(e, t) {
    var n = t.action, a = t.payload, r = e.state;
    if (t.isTransition) {
      var u = b.T, f = {};
      b.T = f;
      try {
        var h = n(r, a), y = b.S;
        y !== null && y(f, h), vd(e, t, h);
      } catch (R) {
        Ku(e, t, R);
      } finally {
        u !== null && f.types !== null && (u.types = f.types), b.T = u;
      }
    } else
      try {
        u = n(r, a), vd(e, t, u);
      } catch (R) {
        Ku(e, t, R);
      }
  }
  function vd(e, t, n) {
    n !== null && typeof n == "object" && typeof n.then == "function" ? n.then(
      function(a) {
        Sd(e, t, a);
      },
      function(a) {
        return Ku(e, t, a);
      }
    ) : Sd(e, t, n);
  }
  function Sd(e, t, n) {
    t.status = "fulfilled", t.value = n, bd(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, gd(e, n)));
  }
  function Ku(e, t, n) {
    var a = e.pending;
    if (e.pending = null, a !== null) {
      a = a.next;
      do
        t.status = "rejected", t.reason = n, bd(t), t = t.next;
      while (t !== a);
    }
    e.action = null;
  }
  function bd(e) {
    e = e.listeners;
    for (var t = 0; t < e.length; t++) (0, e[t])();
  }
  function Ed(e, t) {
    return t;
  }
  function wd(e, t) {
    if (ve) {
      var n = xe.formState;
      if (n !== null) {
        e: {
          var a = re;
          if (ve) {
            if (je) {
              t: {
                for (var r = je, u = Ft; r.nodeType !== 8; ) {
                  if (!u) {
                    r = null;
                    break t;
                  }
                  if (r = Wt(
                    r.nextSibling
                  ), r === null) {
                    r = null;
                    break t;
                  }
                }
                u = r.data, r = u === "F!" || u === "F" ? r : null;
              }
              if (r) {
                je = Wt(
                  r.nextSibling
                ), a = r.data === "F!";
                break e;
              }
            }
            Gn(a);
          }
          a = !1;
        }
        a && (t = n[0]);
      }
    }
    return n = pt(), n.memoizedState = n.baseState = t, a = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Ed,
      lastRenderedState: t
    }, n.queue = a, n = Yd.bind(
      null,
      re,
      a
    ), a.dispatch = n, a = Vu(!1), u = ku.bind(
      null,
      re,
      !1,
      a.queue
    ), a = pt(), r = {
      state: t,
      dispatch: null,
      action: e,
      pending: null
    }, a.queue = r, n = N0.bind(
      null,
      re,
      r,
      u,
      n
    ), r.dispatch = n, a.memoizedState = e, [t, n, !1];
  }
  function Ad(e) {
    var t = Ke();
    return Od(t, Me, e);
  }
  function Od(e, t, n) {
    if (t = Gu(
      e,
      t,
      Ed
    )[0], e = Er(zn)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var a = Ia(t);
      } catch (f) {
        throw f === la ? or : f;
      }
    else a = t;
    t = Ke();
    var r = t.queue, u = r.dispatch;
    return n !== t.memoizedState && (re.flags |= 2048, ua(
      9,
      { destroy: void 0 },
      x0.bind(null, r, n),
      null
    )), [a, u, e];
  }
  function x0(e, t) {
    e.action = t;
  }
  function Rd(e) {
    var t = Ke(), n = Me;
    if (n !== null)
      return Od(t, n, e);
    Ke(), t = t.memoizedState, n = Ke();
    var a = n.queue.dispatch;
    return n.memoizedState = e, [t, a, !1];
  }
  function ua(e, t, n, a) {
    return e = { tag: e, create: n, deps: a, inst: t, next: null }, t = re.updateQueue, t === null && (t = Sr(), re.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (a = n.next, n.next = e, e.next = a, t.lastEffect = e), e;
  }
  function zd() {
    return Ke().memoizedState;
  }
  function wr(e, t, n, a) {
    var r = pt();
    re.flags |= e, r.memoizedState = ua(
      1 | t,
      { destroy: void 0 },
      n,
      a === void 0 ? null : a
    );
  }
  function Ar(e, t, n, a) {
    var r = Ke();
    a = a === void 0 ? null : a;
    var u = r.memoizedState.inst;
    Me !== null && a !== null && _u(a, Me.memoizedState.deps) ? r.memoizedState = ua(t, u, n, a) : (re.flags |= e, r.memoizedState = ua(
      1 | t,
      u,
      n,
      a
    ));
  }
  function Dd(e, t) {
    wr(8390656, 8, e, t);
  }
  function Pu(e, t) {
    Ar(2048, 8, e, t);
  }
  function q0(e) {
    re.flags |= 4;
    var t = re.updateQueue;
    if (t === null)
      t = Sr(), re.updateQueue = t, t.events = [e];
    else {
      var n = t.events;
      n === null ? t.events = [e] : n.push(e);
    }
  }
  function Md(e) {
    var t = Ke().memoizedState;
    return q0({ ref: t, nextImpl: e }), function() {
      if ((Re & 2) !== 0) throw Error(c(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function Td(e, t) {
    return Ar(4, 2, e, t);
  }
  function Ud(e, t) {
    return Ar(4, 4, e, t);
  }
  function Nd(e, t) {
    if (typeof t == "function") {
      e = e();
      var n = t(e);
      return function() {
        typeof n == "function" ? n() : t(null);
      };
    }
    if (t != null)
      return e = e(), t.current = e, function() {
        t.current = null;
      };
  }
  function xd(e, t, n) {
    n = n != null ? n.concat([e]) : null, Ar(4, 4, Nd.bind(null, t, e), n);
  }
  function Ju() {
  }
  function qd(e, t) {
    var n = Ke();
    t = t === void 0 ? null : t;
    var a = n.memoizedState;
    return t !== null && _u(t, a[1]) ? a[0] : (n.memoizedState = [e, t], e);
  }
  function jd(e, t) {
    var n = Ke();
    t = t === void 0 ? null : t;
    var a = n.memoizedState;
    if (t !== null && _u(t, a[1]))
      return a[0];
    if (a = e(), Tl) {
      Cn(!0);
      try {
        e();
      } finally {
        Cn(!1);
      }
    }
    return n.memoizedState = [a, t], a;
  }
  function Fu(e, t, n) {
    return n === void 0 || (Rn & 1073741824) !== 0 && (pe & 261930) === 0 ? e.memoizedState = t : (e.memoizedState = n, e = Hh(), re.lanes |= e, kn |= e, n);
  }
  function Hd(e, t, n, a) {
    return qt(n, t) ? n : ia.current !== null ? (e = Fu(e, n, a), qt(e, t) || (ke = !0), e) : (Rn & 42) === 0 || (Rn & 1073741824) !== 0 && (pe & 261930) === 0 ? (ke = !0, e.memoizedState = n) : (e = Hh(), re.lanes |= e, kn |= e, t);
  }
  function Bd(e, t, n, a, r) {
    var u = x.p;
    x.p = u !== 0 && 8 > u ? u : 8;
    var f = b.T, h = {};
    b.T = h, ku(e, !1, t, n);
    try {
      var y = r(), R = b.S;
      if (R !== null && R(h, y), y !== null && typeof y == "object" && typeof y.then == "function") {
        var M = M0(
          y,
          a
        );
        ei(
          e,
          t,
          M,
          Lt(e)
        );
      } else
        ei(
          e,
          t,
          a,
          Lt(e)
        );
    } catch (U) {
      ei(
        e,
        t,
        { then: function() {
        }, status: "rejected", reason: U },
        Lt()
      );
    } finally {
      x.p = u, f !== null && h.types !== null && (f.types = h.types), b.T = f;
    }
  }
  function j0() {
  }
  function $u(e, t, n, a) {
    if (e.tag !== 5) throw Error(c(476));
    var r = _d(e).queue;
    Bd(
      e,
      r,
      t,
      L,
      n === null ? j0 : function() {
        return Cd(e), n(a);
      }
    );
  }
  function _d(e) {
    var t = e.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: L,
      baseState: L,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: zn,
        lastRenderedState: L
      },
      next: null
    };
    var n = {};
    return t.next = {
      memoizedState: n,
      baseState: n,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: zn,
        lastRenderedState: n
      },
      next: null
    }, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
  }
  function Cd(e) {
    var t = _d(e);
    t.next === null && (t = e.alternate.memoizedState), ei(
      e,
      t.next.queue,
      {},
      Lt()
    );
  }
  function Wu() {
    return ft(gi);
  }
  function Ld() {
    return Ke().memoizedState;
  }
  function Xd() {
    return Ke().memoizedState;
  }
  function H0(e) {
    for (var t = e.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var n = Lt();
          e = Kn(n);
          var a = Pn(t, e, n);
          a !== null && (zt(a, t, n), Fa(a, t, n)), t = { cache: zu() }, e.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function B0(e, t, n) {
    var a = Lt();
    n = {
      lane: a,
      revertLane: 0,
      gesture: null,
      action: n,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, Or(e) ? Qd(t, n) : (n = pu(e, t, n, a), n !== null && (zt(n, e, a), Gd(n, t, a)));
  }
  function Yd(e, t, n) {
    var a = Lt();
    ei(e, t, n, a);
  }
  function ei(e, t, n, a) {
    var r = {
      lane: a,
      revertLane: 0,
      gesture: null,
      action: n,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (Or(e)) Qd(t, r);
    else {
      var u = e.alternate;
      if (e.lanes === 0 && (u === null || u.lanes === 0) && (u = t.lastRenderedReducer, u !== null))
        try {
          var f = t.lastRenderedState, h = u(f, n);
          if (r.hasEagerState = !0, r.eagerState = h, qt(h, f))
            return ar(e, t, r, 0), xe === null && lr(), !1;
        } catch {
        }
      if (n = pu(e, t, r, a), n !== null)
        return zt(n, e, a), Gd(n, t, a), !0;
    }
    return !1;
  }
  function ku(e, t, n, a) {
    if (a = {
      lane: 2,
      revertLane: Uc(),
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, Or(e)) {
      if (t) throw Error(c(479));
    } else
      t = pu(
        e,
        n,
        a,
        2
      ), t !== null && zt(t, e, 2);
  }
  function Or(e) {
    var t = e.alternate;
    return e === re || t !== null && t === re;
  }
  function Qd(e, t) {
    ra = gr = !0;
    var n = e.pending;
    n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
  }
  function Gd(e, t, n) {
    if ((n & 4194048) !== 0) {
      var a = t.lanes;
      a &= e.pendingLanes, n |= a, t.lanes = n, Pf(e, n);
    }
  }
  var ti = {
    readContext: ft,
    use: br,
    useCallback: Ye,
    useContext: Ye,
    useEffect: Ye,
    useImperativeHandle: Ye,
    useLayoutEffect: Ye,
    useInsertionEffect: Ye,
    useMemo: Ye,
    useReducer: Ye,
    useRef: Ye,
    useState: Ye,
    useDebugValue: Ye,
    useDeferredValue: Ye,
    useTransition: Ye,
    useSyncExternalStore: Ye,
    useId: Ye,
    useHostTransitionStatus: Ye,
    useFormState: Ye,
    useActionState: Ye,
    useOptimistic: Ye,
    useMemoCache: Ye,
    useCacheRefresh: Ye
  };
  ti.useEffectEvent = Ye;
  var Zd = {
    readContext: ft,
    use: br,
    useCallback: function(e, t) {
      return pt().memoizedState = [
        e,
        t === void 0 ? null : t
      ], e;
    },
    useContext: ft,
    useEffect: Dd,
    useImperativeHandle: function(e, t, n) {
      n = n != null ? n.concat([e]) : null, wr(
        4194308,
        4,
        Nd.bind(null, t, e),
        n
      );
    },
    useLayoutEffect: function(e, t) {
      return wr(4194308, 4, e, t);
    },
    useInsertionEffect: function(e, t) {
      wr(4, 2, e, t);
    },
    useMemo: function(e, t) {
      var n = pt();
      t = t === void 0 ? null : t;
      var a = e();
      if (Tl) {
        Cn(!0);
        try {
          e();
        } finally {
          Cn(!1);
        }
      }
      return n.memoizedState = [a, t], a;
    },
    useReducer: function(e, t, n) {
      var a = pt();
      if (n !== void 0) {
        var r = n(t);
        if (Tl) {
          Cn(!0);
          try {
            n(t);
          } finally {
            Cn(!1);
          }
        }
      } else r = t;
      return a.memoizedState = a.baseState = r, e = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: e,
        lastRenderedState: r
      }, a.queue = e, e = e.dispatch = B0.bind(
        null,
        re,
        e
      ), [a.memoizedState, e];
    },
    useRef: function(e) {
      var t = pt();
      return e = { current: e }, t.memoizedState = e;
    },
    useState: function(e) {
      e = Vu(e);
      var t = e.queue, n = Yd.bind(null, re, t);
      return t.dispatch = n, [e.memoizedState, n];
    },
    useDebugValue: Ju,
    useDeferredValue: function(e, t) {
      var n = pt();
      return Fu(n, e, t);
    },
    useTransition: function() {
      var e = Vu(!1);
      return e = Bd.bind(
        null,
        re,
        e.queue,
        !0,
        !1
      ), pt().memoizedState = e, [!1, e];
    },
    useSyncExternalStore: function(e, t, n) {
      var a = re, r = pt();
      if (ve) {
        if (n === void 0)
          throw Error(c(407));
        n = n();
      } else {
        if (n = t(), xe === null)
          throw Error(c(349));
        (pe & 127) !== 0 || od(a, t, n);
      }
      r.memoizedState = n;
      var u = { value: n, getSnapshot: t };
      return r.queue = u, Dd(hd.bind(null, a, u, e), [
        e
      ]), a.flags |= 2048, ua(
        9,
        { destroy: void 0 },
        dd.bind(
          null,
          a,
          u,
          n,
          t
        ),
        null
      ), n;
    },
    useId: function() {
      var e = pt(), t = xe.identifierPrefix;
      if (ve) {
        var n = fn, a = cn;
        n = (a & ~(1 << 32 - xt(a) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = vr++, 0 < n && (t += "H" + n.toString(32)), t += "_";
      } else
        n = T0++, t = "_" + t + "r_" + n.toString(32) + "_";
      return e.memoizedState = t;
    },
    useHostTransitionStatus: Wu,
    useFormState: wd,
    useActionState: wd,
    useOptimistic: function(e) {
      var t = pt();
      t.memoizedState = t.baseState = e;
      var n = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = n, t = ku.bind(
        null,
        re,
        !0,
        n
      ), n.dispatch = t, [e, t];
    },
    useMemoCache: Qu,
    useCacheRefresh: function() {
      return pt().memoizedState = H0.bind(
        null,
        re
      );
    },
    useEffectEvent: function(e) {
      var t = pt(), n = { impl: e };
      return t.memoizedState = n, function() {
        if ((Re & 2) !== 0)
          throw Error(c(440));
        return n.impl.apply(void 0, arguments);
      };
    }
  }, Iu = {
    readContext: ft,
    use: br,
    useCallback: qd,
    useContext: ft,
    useEffect: Pu,
    useImperativeHandle: xd,
    useInsertionEffect: Td,
    useLayoutEffect: Ud,
    useMemo: jd,
    useReducer: Er,
    useRef: zd,
    useState: function() {
      return Er(zn);
    },
    useDebugValue: Ju,
    useDeferredValue: function(e, t) {
      var n = Ke();
      return Hd(
        n,
        Me.memoizedState,
        e,
        t
      );
    },
    useTransition: function() {
      var e = Er(zn)[0], t = Ke().memoizedState;
      return [
        typeof e == "boolean" ? e : Ia(e),
        t
      ];
    },
    useSyncExternalStore: fd,
    useId: Ld,
    useHostTransitionStatus: Wu,
    useFormState: Ad,
    useActionState: Ad,
    useOptimistic: function(e, t) {
      var n = Ke();
      return yd(n, Me, e, t);
    },
    useMemoCache: Qu,
    useCacheRefresh: Xd
  };
  Iu.useEffectEvent = Md;
  var Vd = {
    readContext: ft,
    use: br,
    useCallback: qd,
    useContext: ft,
    useEffect: Pu,
    useImperativeHandle: xd,
    useInsertionEffect: Td,
    useLayoutEffect: Ud,
    useMemo: jd,
    useReducer: Zu,
    useRef: zd,
    useState: function() {
      return Zu(zn);
    },
    useDebugValue: Ju,
    useDeferredValue: function(e, t) {
      var n = Ke();
      return Me === null ? Fu(n, e, t) : Hd(
        n,
        Me.memoizedState,
        e,
        t
      );
    },
    useTransition: function() {
      var e = Zu(zn)[0], t = Ke().memoizedState;
      return [
        typeof e == "boolean" ? e : Ia(e),
        t
      ];
    },
    useSyncExternalStore: fd,
    useId: Ld,
    useHostTransitionStatus: Wu,
    useFormState: Rd,
    useActionState: Rd,
    useOptimistic: function(e, t) {
      var n = Ke();
      return Me !== null ? yd(n, Me, e, t) : (n.baseState = e, [e, n.queue.dispatch]);
    },
    useMemoCache: Qu,
    useCacheRefresh: Xd
  };
  Vd.useEffectEvent = Md;
  function ec(e, t, n, a) {
    t = e.memoizedState, n = n(a, t), n = n == null ? t : w({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
  }
  var tc = {
    enqueueSetState: function(e, t, n) {
      e = e._reactInternals;
      var a = Lt(), r = Kn(a);
      r.payload = t, n != null && (r.callback = n), t = Pn(e, r, a), t !== null && (zt(t, e, a), Fa(t, e, a));
    },
    enqueueReplaceState: function(e, t, n) {
      e = e._reactInternals;
      var a = Lt(), r = Kn(a);
      r.tag = 1, r.payload = t, n != null && (r.callback = n), t = Pn(e, r, a), t !== null && (zt(t, e, a), Fa(t, e, a));
    },
    enqueueForceUpdate: function(e, t) {
      e = e._reactInternals;
      var n = Lt(), a = Kn(n);
      a.tag = 2, t != null && (a.callback = t), t = Pn(e, a, n), t !== null && (zt(t, e, n), Fa(t, e, n));
    }
  };
  function Kd(e, t, n, a, r, u, f) {
    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(a, u, f) : t.prototype && t.prototype.isPureReactComponent ? !Ya(n, a) || !Ya(r, u) : !0;
  }
  function Pd(e, t, n, a) {
    e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, a), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, a), t.state !== e && tc.enqueueReplaceState(t, t.state, null);
  }
  function Ul(e, t) {
    var n = t;
    if ("ref" in t) {
      n = {};
      for (var a in t)
        a !== "ref" && (n[a] = t[a]);
    }
    if (e = e.defaultProps) {
      n === t && (n = w({}, n));
      for (var r in e)
        n[r] === void 0 && (n[r] = e[r]);
    }
    return n;
  }
  function Jd(e) {
    nr(e);
  }
  function Fd(e) {
    console.error(e);
  }
  function $d(e) {
    nr(e);
  }
  function Rr(e, t) {
    try {
      var n = e.onUncaughtError;
      n(t.value, { componentStack: t.stack });
    } catch (a) {
      setTimeout(function() {
        throw a;
      });
    }
  }
  function Wd(e, t, n) {
    try {
      var a = e.onCaughtError;
      a(n.value, {
        componentStack: n.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null
      });
    } catch (r) {
      setTimeout(function() {
        throw r;
      });
    }
  }
  function nc(e, t, n) {
    return n = Kn(n), n.tag = 3, n.payload = { element: null }, n.callback = function() {
      Rr(e, t);
    }, n;
  }
  function kd(e) {
    return e = Kn(e), e.tag = 3, e;
  }
  function Id(e, t, n, a) {
    var r = n.type.getDerivedStateFromError;
    if (typeof r == "function") {
      var u = a.value;
      e.payload = function() {
        return r(u);
      }, e.callback = function() {
        Wd(t, n, a);
      };
    }
    var f = n.stateNode;
    f !== null && typeof f.componentDidCatch == "function" && (e.callback = function() {
      Wd(t, n, a), typeof r != "function" && (In === null ? In = /* @__PURE__ */ new Set([this]) : In.add(this));
      var h = a.stack;
      this.componentDidCatch(a.value, {
        componentStack: h !== null ? h : ""
      });
    });
  }
  function _0(e, t, n, a, r) {
    if (n.flags |= 32768, a !== null && typeof a == "object" && typeof a.then == "function") {
      if (t = n.alternate, t !== null && ea(
        t,
        n,
        r,
        !0
      ), n = Ht.current, n !== null) {
        switch (n.tag) {
          case 31:
          case 13:
            return $t === null ? _r() : n.alternate === null && Qe === 0 && (Qe = 3), n.flags &= -257, n.flags |= 65536, n.lanes = r, a === dr ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = /* @__PURE__ */ new Set([a]) : t.add(a), Dc(e, a, r)), !1;
          case 22:
            return n.flags |= 65536, a === dr ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([a])
            }, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = /* @__PURE__ */ new Set([a]) : n.add(a)), Dc(e, a, r)), !1;
        }
        throw Error(c(435, n.tag));
      }
      return Dc(e, a, r), _r(), !1;
    }
    if (ve)
      return t = Ht.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = r, a !== Eu && (e = Error(c(422), { cause: a }), Za(Kt(e, n)))) : (a !== Eu && (t = Error(c(423), {
        cause: a
      }), Za(
        Kt(t, n)
      )), e = e.current.alternate, e.flags |= 65536, r &= -r, e.lanes |= r, a = Kt(a, n), r = nc(
        e.stateNode,
        a,
        r
      ), xu(e, r), Qe !== 4 && (Qe = 2)), !1;
    var u = Error(c(520), { cause: a });
    if (u = Kt(u, n), ci === null ? ci = [u] : ci.push(u), Qe !== 4 && (Qe = 2), t === null) return !0;
    a = Kt(a, n), n = t;
    do {
      switch (n.tag) {
        case 3:
          return n.flags |= 65536, e = r & -r, n.lanes |= e, e = nc(n.stateNode, a, e), xu(n, e), !1;
        case 1:
          if (t = n.type, u = n.stateNode, (n.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || u !== null && typeof u.componentDidCatch == "function" && (In === null || !In.has(u))))
            return n.flags |= 65536, r &= -r, n.lanes |= r, r = kd(r), Id(
              r,
              e,
              n,
              a
            ), xu(n, r), !1;
      }
      n = n.return;
    } while (n !== null);
    return !1;
  }
  var lc = Error(c(461)), ke = !1;
  function ot(e, t, n, a) {
    t.child = e === null ? ld(t, null, n, a) : Ml(
      t,
      e.child,
      n,
      a
    );
  }
  function eh(e, t, n, a, r) {
    n = n.render;
    var u = t.ref;
    if ("ref" in a) {
      var f = {};
      for (var h in a)
        h !== "ref" && (f[h] = a[h]);
    } else f = a;
    return Ol(t), a = Cu(
      e,
      t,
      n,
      f,
      u,
      r
    ), h = Lu(), e !== null && !ke ? (Xu(e, t, r), Dn(e, t, r)) : (ve && h && Su(t), t.flags |= 1, ot(e, t, a, r), t.child);
  }
  function th(e, t, n, a, r) {
    if (e === null) {
      var u = n.type;
      return typeof u == "function" && !yu(u) && u.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = u, nh(
        e,
        t,
        u,
        a,
        r
      )) : (e = rr(
        n.type,
        null,
        a,
        t,
        t.mode,
        r
      ), e.ref = t.ref, e.return = t, t.child = e);
    }
    if (u = e.child, !oc(e, r)) {
      var f = u.memoizedProps;
      if (n = n.compare, n = n !== null ? n : Ya, n(f, a) && e.ref === t.ref)
        return Dn(e, t, r);
    }
    return t.flags |= 1, e = En(u, a), e.ref = t.ref, e.return = t, t.child = e;
  }
  function nh(e, t, n, a, r) {
    if (e !== null) {
      var u = e.memoizedProps;
      if (Ya(u, a) && e.ref === t.ref)
        if (ke = !1, t.pendingProps = a = u, oc(e, r))
          (e.flags & 131072) !== 0 && (ke = !0);
        else
          return t.lanes = e.lanes, Dn(e, t, r);
    }
    return ac(
      e,
      t,
      n,
      a,
      r
    );
  }
  function lh(e, t, n, a) {
    var r = a.children, u = e !== null ? e.memoizedState : null;
    if (e === null && t.stateNode === null && (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), a.mode === "hidden") {
      if ((t.flags & 128) !== 0) {
        if (u = u !== null ? u.baseLanes | n : n, e !== null) {
          for (a = t.child = e.child, r = 0; a !== null; )
            r = r | a.lanes | a.childLanes, a = a.sibling;
          a = r & ~u;
        } else a = 0, t.child = null;
        return ah(
          e,
          t,
          u,
          n,
          a
        );
      }
      if ((n & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, e !== null && fr(
          t,
          u !== null ? u.cachePool : null
        ), u !== null ? rd(t, u) : ju(), sd(t);
      else
        return a = t.lanes = 536870912, ah(
          e,
          t,
          u !== null ? u.baseLanes | n : n,
          n,
          a
        );
    } else
      u !== null ? (fr(t, u.cachePool), rd(t, u), Fn(), t.memoizedState = null) : (e !== null && fr(t, null), ju(), Fn());
    return ot(e, t, r, n), t.child;
  }
  function ni(e, t) {
    return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function ah(e, t, n, a, r) {
    var u = Mu();
    return u = u === null ? null : { parent: $e._currentValue, pool: u }, t.memoizedState = {
      baseLanes: n,
      cachePool: u
    }, e !== null && fr(t, null), ju(), sd(t), e !== null && ea(e, t, a, !0), t.childLanes = r, null;
  }
  function zr(e, t) {
    return t = Mr(
      { mode: t.mode, children: t.children },
      e.mode
    ), t.ref = e.ref, e.child = t, t.return = e, t;
  }
  function ih(e, t, n) {
    return Ml(t, e.child, null, n), e = zr(t, t.pendingProps), e.flags |= 2, Bt(t), t.memoizedState = null, e;
  }
  function C0(e, t, n) {
    var a = t.pendingProps, r = (t.flags & 128) !== 0;
    if (t.flags &= -129, e === null) {
      if (ve) {
        if (a.mode === "hidden")
          return e = zr(t, a), t.lanes = 536870912, ni(null, e);
        if (Bu(t), (e = je) ? (e = gm(
          e,
          Ft
        ), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
          dehydrated: e,
          treeContext: Yn !== null ? { id: cn, overflow: fn } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, n = Qo(e), n.return = t, t.child = n, ct = t, je = null)) : e = null, e === null) throw Gn(t);
        return t.lanes = 536870912, null;
      }
      return zr(t, a);
    }
    var u = e.memoizedState;
    if (u !== null) {
      var f = u.dehydrated;
      if (Bu(t), r)
        if (t.flags & 256)
          t.flags &= -257, t = ih(
            e,
            t,
            n
          );
        else if (t.memoizedState !== null)
          t.child = e.child, t.flags |= 128, t = null;
        else throw Error(c(558));
      else if (ke || ea(e, t, n, !1), r = (n & e.childLanes) !== 0, ke || r) {
        if (a = xe, a !== null && (f = Jf(a, n), f !== 0 && f !== u.retryLane))
          throw u.retryLane = f, bl(e, f), zt(a, e, f), lc;
        _r(), t = ih(
          e,
          t,
          n
        );
      } else
        e = u.treeContext, je = Wt(f.nextSibling), ct = t, ve = !0, Qn = null, Ft = !1, e !== null && Vo(t, e), t = zr(t, a), t.flags |= 4096;
      return t;
    }
    return e = En(e.child, {
      mode: a.mode,
      children: a.children
    }), e.ref = t.ref, t.child = e, e.return = t, e;
  }
  function Dr(e, t) {
    var n = t.ref;
    if (n === null)
      e !== null && e.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof n != "function" && typeof n != "object")
        throw Error(c(284));
      (e === null || e.ref !== n) && (t.flags |= 4194816);
    }
  }
  function ac(e, t, n, a, r) {
    return Ol(t), n = Cu(
      e,
      t,
      n,
      a,
      void 0,
      r
    ), a = Lu(), e !== null && !ke ? (Xu(e, t, r), Dn(e, t, r)) : (ve && a && Su(t), t.flags |= 1, ot(e, t, n, r), t.child);
  }
  function rh(e, t, n, a, r, u) {
    return Ol(t), t.updateQueue = null, n = cd(
      t,
      a,
      n,
      r
    ), ud(e), a = Lu(), e !== null && !ke ? (Xu(e, t, u), Dn(e, t, u)) : (ve && a && Su(t), t.flags |= 1, ot(e, t, n, u), t.child);
  }
  function sh(e, t, n, a, r) {
    if (Ol(t), t.stateNode === null) {
      var u = $l, f = n.contextType;
      typeof f == "object" && f !== null && (u = ft(f)), u = new n(a, u), t.memoizedState = u.state !== null && u.state !== void 0 ? u.state : null, u.updater = tc, t.stateNode = u, u._reactInternals = t, u = t.stateNode, u.props = a, u.state = t.memoizedState, u.refs = {}, Uu(t), f = n.contextType, u.context = typeof f == "object" && f !== null ? ft(f) : $l, u.state = t.memoizedState, f = n.getDerivedStateFromProps, typeof f == "function" && (ec(
        t,
        n,
        f,
        a
      ), u.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof u.getSnapshotBeforeUpdate == "function" || typeof u.UNSAFE_componentWillMount != "function" && typeof u.componentWillMount != "function" || (f = u.state, typeof u.componentWillMount == "function" && u.componentWillMount(), typeof u.UNSAFE_componentWillMount == "function" && u.UNSAFE_componentWillMount(), f !== u.state && tc.enqueueReplaceState(u, u.state, null), Wa(t, a, u, r), $a(), u.state = t.memoizedState), typeof u.componentDidMount == "function" && (t.flags |= 4194308), a = !0;
    } else if (e === null) {
      u = t.stateNode;
      var h = t.memoizedProps, y = Ul(n, h);
      u.props = y;
      var R = u.context, M = n.contextType;
      f = $l, typeof M == "object" && M !== null && (f = ft(M));
      var U = n.getDerivedStateFromProps;
      M = typeof U == "function" || typeof u.getSnapshotBeforeUpdate == "function", h = t.pendingProps !== h, M || typeof u.UNSAFE_componentWillReceiveProps != "function" && typeof u.componentWillReceiveProps != "function" || (h || R !== f) && Pd(
        t,
        u,
        a,
        f
      ), Vn = !1;
      var z = t.memoizedState;
      u.state = z, Wa(t, a, u, r), $a(), R = t.memoizedState, h || z !== R || Vn ? (typeof U == "function" && (ec(
        t,
        n,
        U,
        a
      ), R = t.memoizedState), (y = Vn || Kd(
        t,
        n,
        y,
        a,
        z,
        R,
        f
      )) ? (M || typeof u.UNSAFE_componentWillMount != "function" && typeof u.componentWillMount != "function" || (typeof u.componentWillMount == "function" && u.componentWillMount(), typeof u.UNSAFE_componentWillMount == "function" && u.UNSAFE_componentWillMount()), typeof u.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof u.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = a, t.memoizedState = R), u.props = a, u.state = R, u.context = f, a = y) : (typeof u.componentDidMount == "function" && (t.flags |= 4194308), a = !1);
    } else {
      u = t.stateNode, Nu(e, t), f = t.memoizedProps, M = Ul(n, f), u.props = M, U = t.pendingProps, z = u.context, R = n.contextType, y = $l, typeof R == "object" && R !== null && (y = ft(R)), h = n.getDerivedStateFromProps, (R = typeof h == "function" || typeof u.getSnapshotBeforeUpdate == "function") || typeof u.UNSAFE_componentWillReceiveProps != "function" && typeof u.componentWillReceiveProps != "function" || (f !== U || z !== y) && Pd(
        t,
        u,
        a,
        y
      ), Vn = !1, z = t.memoizedState, u.state = z, Wa(t, a, u, r), $a();
      var D = t.memoizedState;
      f !== U || z !== D || Vn || e !== null && e.dependencies !== null && ur(e.dependencies) ? (typeof h == "function" && (ec(
        t,
        n,
        h,
        a
      ), D = t.memoizedState), (M = Vn || Kd(
        t,
        n,
        M,
        a,
        z,
        D,
        y
      ) || e !== null && e.dependencies !== null && ur(e.dependencies)) ? (R || typeof u.UNSAFE_componentWillUpdate != "function" && typeof u.componentWillUpdate != "function" || (typeof u.componentWillUpdate == "function" && u.componentWillUpdate(a, D, y), typeof u.UNSAFE_componentWillUpdate == "function" && u.UNSAFE_componentWillUpdate(
        a,
        D,
        y
      )), typeof u.componentDidUpdate == "function" && (t.flags |= 4), typeof u.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof u.componentDidUpdate != "function" || f === e.memoizedProps && z === e.memoizedState || (t.flags |= 4), typeof u.getSnapshotBeforeUpdate != "function" || f === e.memoizedProps && z === e.memoizedState || (t.flags |= 1024), t.memoizedProps = a, t.memoizedState = D), u.props = a, u.state = D, u.context = y, a = M) : (typeof u.componentDidUpdate != "function" || f === e.memoizedProps && z === e.memoizedState || (t.flags |= 4), typeof u.getSnapshotBeforeUpdate != "function" || f === e.memoizedProps && z === e.memoizedState || (t.flags |= 1024), a = !1);
    }
    return u = a, Dr(e, t), a = (t.flags & 128) !== 0, u || a ? (u = t.stateNode, n = a && typeof n.getDerivedStateFromError != "function" ? null : u.render(), t.flags |= 1, e !== null && a ? (t.child = Ml(
      t,
      e.child,
      null,
      r
    ), t.child = Ml(
      t,
      null,
      n,
      r
    )) : ot(e, t, n, r), t.memoizedState = u.state, e = t.child) : e = Dn(
      e,
      t,
      r
    ), e;
  }
  function uh(e, t, n, a) {
    return wl(), t.flags |= 256, ot(e, t, n, a), t.child;
  }
  var ic = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function rc(e) {
    return { baseLanes: e, cachePool: Wo() };
  }
  function sc(e, t, n) {
    return e = e !== null ? e.childLanes & ~n : 0, t && (e |= Ct), e;
  }
  function ch(e, t, n) {
    var a = t.pendingProps, r = !1, u = (t.flags & 128) !== 0, f;
    if ((f = u) || (f = e !== null && e.memoizedState === null ? !1 : (Ve.current & 2) !== 0), f && (r = !0, t.flags &= -129), f = (t.flags & 32) !== 0, t.flags &= -33, e === null) {
      if (ve) {
        if (r ? Jn(t) : Fn(), (e = je) ? (e = gm(
          e,
          Ft
        ), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
          dehydrated: e,
          treeContext: Yn !== null ? { id: cn, overflow: fn } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, n = Qo(e), n.return = t, t.child = n, ct = t, je = null)) : e = null, e === null) throw Gn(t);
        return Gc(e) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      var h = a.children;
      return a = a.fallback, r ? (Fn(), r = t.mode, h = Mr(
        { mode: "hidden", children: h },
        r
      ), a = El(
        a,
        r,
        n,
        null
      ), h.return = t, a.return = t, h.sibling = a, t.child = h, a = t.child, a.memoizedState = rc(n), a.childLanes = sc(
        e,
        f,
        n
      ), t.memoizedState = ic, ni(null, a)) : (Jn(t), uc(t, h));
    }
    var y = e.memoizedState;
    if (y !== null && (h = y.dehydrated, h !== null)) {
      if (u)
        t.flags & 256 ? (Jn(t), t.flags &= -257, t = cc(
          e,
          t,
          n
        )) : t.memoizedState !== null ? (Fn(), t.child = e.child, t.flags |= 128, t = null) : (Fn(), h = a.fallback, r = t.mode, a = Mr(
          { mode: "visible", children: a.children },
          r
        ), h = El(
          h,
          r,
          n,
          null
        ), h.flags |= 2, a.return = t, h.return = t, a.sibling = h, t.child = a, Ml(
          t,
          e.child,
          null,
          n
        ), a = t.child, a.memoizedState = rc(n), a.childLanes = sc(
          e,
          f,
          n
        ), t.memoizedState = ic, t = ni(null, a));
      else if (Jn(t), Gc(h)) {
        if (f = h.nextSibling && h.nextSibling.dataset, f) var R = f.dgst;
        f = R, a = Error(c(419)), a.stack = "", a.digest = f, Za({ value: a, source: null, stack: null }), t = cc(
          e,
          t,
          n
        );
      } else if (ke || ea(e, t, n, !1), f = (n & e.childLanes) !== 0, ke || f) {
        if (f = xe, f !== null && (a = Jf(f, n), a !== 0 && a !== y.retryLane))
          throw y.retryLane = a, bl(e, a), zt(f, e, a), lc;
        Qc(h) || _r(), t = cc(
          e,
          t,
          n
        );
      } else
        Qc(h) ? (t.flags |= 192, t.child = e.child, t = null) : (e = y.treeContext, je = Wt(
          h.nextSibling
        ), ct = t, ve = !0, Qn = null, Ft = !1, e !== null && Vo(t, e), t = uc(
          t,
          a.children
        ), t.flags |= 4096);
      return t;
    }
    return r ? (Fn(), h = a.fallback, r = t.mode, y = e.child, R = y.sibling, a = En(y, {
      mode: "hidden",
      children: a.children
    }), a.subtreeFlags = y.subtreeFlags & 65011712, R !== null ? h = En(
      R,
      h
    ) : (h = El(
      h,
      r,
      n,
      null
    ), h.flags |= 2), h.return = t, a.return = t, a.sibling = h, t.child = a, ni(null, a), a = t.child, h = e.child.memoizedState, h === null ? h = rc(n) : (r = h.cachePool, r !== null ? (y = $e._currentValue, r = r.parent !== y ? { parent: y, pool: y } : r) : r = Wo(), h = {
      baseLanes: h.baseLanes | n,
      cachePool: r
    }), a.memoizedState = h, a.childLanes = sc(
      e,
      f,
      n
    ), t.memoizedState = ic, ni(e.child, a)) : (Jn(t), n = e.child, e = n.sibling, n = En(n, {
      mode: "visible",
      children: a.children
    }), n.return = t, n.sibling = null, e !== null && (f = t.deletions, f === null ? (t.deletions = [e], t.flags |= 16) : f.push(e)), t.child = n, t.memoizedState = null, n);
  }
  function uc(e, t) {
    return t = Mr(
      { mode: "visible", children: t },
      e.mode
    ), t.return = e, e.child = t;
  }
  function Mr(e, t) {
    return e = jt(22, e, null, t), e.lanes = 0, e;
  }
  function cc(e, t, n) {
    return Ml(t, e.child, null, n), e = uc(
      t,
      t.pendingProps.children
    ), e.flags |= 2, t.memoizedState = null, e;
  }
  function fh(e, t, n) {
    e.lanes |= t;
    var a = e.alternate;
    a !== null && (a.lanes |= t), Ou(e.return, t, n);
  }
  function fc(e, t, n, a, r, u) {
    var f = e.memoizedState;
    f === null ? e.memoizedState = {
      isBackwards: t,
      rendering: null,
      renderingStartTime: 0,
      last: a,
      tail: n,
      tailMode: r,
      treeForkCount: u
    } : (f.isBackwards = t, f.rendering = null, f.renderingStartTime = 0, f.last = a, f.tail = n, f.tailMode = r, f.treeForkCount = u);
  }
  function oh(e, t, n) {
    var a = t.pendingProps, r = a.revealOrder, u = a.tail;
    a = a.children;
    var f = Ve.current, h = (f & 2) !== 0;
    if (h ? (f = f & 1 | 2, t.flags |= 128) : f &= 1, ee(Ve, f), ot(e, t, a, n), a = ve ? Ga : 0, !h && e !== null && (e.flags & 128) !== 0)
      e: for (e = t.child; e !== null; ) {
        if (e.tag === 13)
          e.memoizedState !== null && fh(e, n, t);
        else if (e.tag === 19)
          fh(e, n, t);
        else if (e.child !== null) {
          e.child.return = e, e = e.child;
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === t)
            break e;
          e = e.return;
        }
        e.sibling.return = e.return, e = e.sibling;
      }
    switch (r) {
      case "forwards":
        for (n = t.child, r = null; n !== null; )
          e = n.alternate, e !== null && yr(e) === null && (r = n), n = n.sibling;
        n = r, n === null ? (r = t.child, t.child = null) : (r = n.sibling, n.sibling = null), fc(
          t,
          !1,
          r,
          n,
          u,
          a
        );
        break;
      case "backwards":
      case "unstable_legacy-backwards":
        for (n = null, r = t.child, t.child = null; r !== null; ) {
          if (e = r.alternate, e !== null && yr(e) === null) {
            t.child = r;
            break;
          }
          e = r.sibling, r.sibling = n, n = r, r = e;
        }
        fc(
          t,
          !0,
          n,
          null,
          u,
          a
        );
        break;
      case "together":
        fc(
          t,
          !1,
          null,
          null,
          void 0,
          a
        );
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function Dn(e, t, n) {
    if (e !== null && (t.dependencies = e.dependencies), kn |= t.lanes, (n & t.childLanes) === 0)
      if (e !== null) {
        if (ea(
          e,
          t,
          n,
          !1
        ), (n & t.childLanes) === 0)
          return null;
      } else return null;
    if (e !== null && t.child !== e.child)
      throw Error(c(153));
    if (t.child !== null) {
      for (e = t.child, n = En(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; )
        e = e.sibling, n = n.sibling = En(e, e.pendingProps), n.return = t;
      n.sibling = null;
    }
    return t.child;
  }
  function oc(e, t) {
    return (e.lanes & t) !== 0 ? !0 : (e = e.dependencies, !!(e !== null && ur(e)));
  }
  function L0(e, t, n) {
    switch (t.tag) {
      case 3:
        Xe(t, t.stateNode.containerInfo), Zn(t, $e, e.memoizedState.cache), wl();
        break;
      case 27:
      case 5:
        _e(t);
        break;
      case 4:
        Xe(t, t.stateNode.containerInfo);
        break;
      case 10:
        Zn(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Bu(t), null;
        break;
      case 13:
        var a = t.memoizedState;
        if (a !== null)
          return a.dehydrated !== null ? (Jn(t), t.flags |= 128, null) : (n & t.child.childLanes) !== 0 ? ch(e, t, n) : (Jn(t), e = Dn(
            e,
            t,
            n
          ), e !== null ? e.sibling : null);
        Jn(t);
        break;
      case 19:
        var r = (e.flags & 128) !== 0;
        if (a = (n & t.childLanes) !== 0, a || (ea(
          e,
          t,
          n,
          !1
        ), a = (n & t.childLanes) !== 0), r) {
          if (a)
            return oh(
              e,
              t,
              n
            );
          t.flags |= 128;
        }
        if (r = t.memoizedState, r !== null && (r.rendering = null, r.tail = null, r.lastEffect = null), ee(Ve, Ve.current), a) break;
        return null;
      case 22:
        return t.lanes = 0, lh(
          e,
          t,
          n,
          t.pendingProps
        );
      case 24:
        Zn(t, $e, e.memoizedState.cache);
    }
    return Dn(e, t, n);
  }
  function dh(e, t, n) {
    if (e !== null)
      if (e.memoizedProps !== t.pendingProps)
        ke = !0;
      else {
        if (!oc(e, n) && (t.flags & 128) === 0)
          return ke = !1, L0(
            e,
            t,
            n
          );
        ke = (e.flags & 131072) !== 0;
      }
    else
      ke = !1, ve && (t.flags & 1048576) !== 0 && Zo(t, Ga, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        e: {
          var a = t.pendingProps;
          if (e = zl(t.elementType), t.type = e, typeof e == "function")
            yu(e) ? (a = Ul(e, a), t.tag = 1, t = sh(
              null,
              t,
              e,
              a,
              n
            )) : (t.tag = 0, t = ac(
              null,
              t,
              e,
              a,
              n
            ));
          else {
            if (e != null) {
              var r = e.$$typeof;
              if (r === fe) {
                t.tag = 11, t = eh(
                  null,
                  t,
                  e,
                  a,
                  n
                );
                break e;
              } else if (r === I) {
                t.tag = 14, t = th(
                  null,
                  t,
                  e,
                  a,
                  n
                );
                break e;
              }
            }
            throw t = $(e) || e, Error(c(306, t, ""));
          }
        }
        return t;
      case 0:
        return ac(
          e,
          t,
          t.type,
          t.pendingProps,
          n
        );
      case 1:
        return a = t.type, r = Ul(
          a,
          t.pendingProps
        ), sh(
          e,
          t,
          a,
          r,
          n
        );
      case 3:
        e: {
          if (Xe(
            t,
            t.stateNode.containerInfo
          ), e === null) throw Error(c(387));
          a = t.pendingProps;
          var u = t.memoizedState;
          r = u.element, Nu(e, t), Wa(t, a, null, n);
          var f = t.memoizedState;
          if (a = f.cache, Zn(t, $e, a), a !== u.cache && Ru(
            t,
            [$e],
            n,
            !0
          ), $a(), a = f.element, u.isDehydrated)
            if (u = {
              element: a,
              isDehydrated: !1,
              cache: f.cache
            }, t.updateQueue.baseState = u, t.memoizedState = u, t.flags & 256) {
              t = uh(
                e,
                t,
                a,
                n
              );
              break e;
            } else if (a !== r) {
              r = Kt(
                Error(c(424)),
                t
              ), Za(r), t = uh(
                e,
                t,
                a,
                n
              );
              break e;
            } else
              for (e = t.stateNode.containerInfo, e.nodeType === 9 ? e = e.body : e = e.nodeName === "HTML" ? e.ownerDocument.body : e, je = Wt(e.firstChild), ct = t, ve = !0, Qn = null, Ft = !0, n = ld(
                t,
                null,
                a,
                n
              ), t.child = n; n; )
                n.flags = n.flags & -3 | 4096, n = n.sibling;
          else {
            if (wl(), a === r) {
              t = Dn(
                e,
                t,
                n
              );
              break e;
            }
            ot(e, t, a, n);
          }
          t = t.child;
        }
        return t;
      case 26:
        return Dr(e, t), e === null ? (n = Am(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = n : ve || (n = t.type, e = t.pendingProps, a = Zr(
          Pe.current
        ).createElement(n), a[ut] = t, a[bt] = e, dt(a, n, e), at(a), t.stateNode = a) : t.memoizedState = Am(
          t.type,
          e.memoizedProps,
          t.pendingProps,
          e.memoizedState
        ), null;
      case 27:
        return _e(t), e === null && ve && (a = t.stateNode = bm(
          t.type,
          t.pendingProps,
          Pe.current
        ), ct = t, Ft = !0, r = je, ll(t.type) ? (Zc = r, je = Wt(a.firstChild)) : je = r), ot(
          e,
          t,
          t.pendingProps.children,
          n
        ), Dr(e, t), e === null && (t.flags |= 4194304), t.child;
      case 5:
        return e === null && ve && ((r = a = je) && (a = pv(
          a,
          t.type,
          t.pendingProps,
          Ft
        ), a !== null ? (t.stateNode = a, ct = t, je = Wt(a.firstChild), Ft = !1, r = !0) : r = !1), r || Gn(t)), _e(t), r = t.type, u = t.pendingProps, f = e !== null ? e.memoizedProps : null, a = u.children, Lc(r, u) ? a = null : f !== null && Lc(r, f) && (t.flags |= 32), t.memoizedState !== null && (r = Cu(
          e,
          t,
          U0,
          null,
          null,
          n
        ), gi._currentValue = r), Dr(e, t), ot(e, t, a, n), t.child;
      case 6:
        return e === null && ve && ((e = n = je) && (n = yv(
          n,
          t.pendingProps,
          Ft
        ), n !== null ? (t.stateNode = n, ct = t, je = null, e = !0) : e = !1), e || Gn(t)), null;
      case 13:
        return ch(e, t, n);
      case 4:
        return Xe(
          t,
          t.stateNode.containerInfo
        ), a = t.pendingProps, e === null ? t.child = Ml(
          t,
          null,
          a,
          n
        ) : ot(e, t, a, n), t.child;
      case 11:
        return eh(
          e,
          t,
          t.type,
          t.pendingProps,
          n
        );
      case 7:
        return ot(
          e,
          t,
          t.pendingProps,
          n
        ), t.child;
      case 8:
        return ot(
          e,
          t,
          t.pendingProps.children,
          n
        ), t.child;
      case 12:
        return ot(
          e,
          t,
          t.pendingProps.children,
          n
        ), t.child;
      case 10:
        return a = t.pendingProps, Zn(t, t.type, a.value), ot(e, t, a.children, n), t.child;
      case 9:
        return r = t.type._context, a = t.pendingProps.children, Ol(t), r = ft(r), a = a(r), t.flags |= 1, ot(e, t, a, n), t.child;
      case 14:
        return th(
          e,
          t,
          t.type,
          t.pendingProps,
          n
        );
      case 15:
        return nh(
          e,
          t,
          t.type,
          t.pendingProps,
          n
        );
      case 19:
        return oh(e, t, n);
      case 31:
        return C0(e, t, n);
      case 22:
        return lh(
          e,
          t,
          n,
          t.pendingProps
        );
      case 24:
        return Ol(t), a = ft($e), e === null ? (r = Mu(), r === null && (r = xe, u = zu(), r.pooledCache = u, u.refCount++, u !== null && (r.pooledCacheLanes |= n), r = u), t.memoizedState = { parent: a, cache: r }, Uu(t), Zn(t, $e, r)) : ((e.lanes & n) !== 0 && (Nu(e, t), Wa(t, null, null, n), $a()), r = e.memoizedState, u = t.memoizedState, r.parent !== a ? (r = { parent: a, cache: a }, t.memoizedState = r, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = r), Zn(t, $e, a)) : (a = u.cache, Zn(t, $e, a), a !== r.cache && Ru(
          t,
          [$e],
          n,
          !0
        ))), ot(
          e,
          t,
          t.pendingProps.children,
          n
        ), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(c(156, t.tag));
  }
  function Mn(e) {
    e.flags |= 4;
  }
  function dc(e, t, n, a, r) {
    if ((t = (e.mode & 32) !== 0) && (t = !1), t) {
      if (e.flags |= 16777216, (r & 335544128) === r)
        if (e.stateNode.complete) e.flags |= 8192;
        else if (Lh()) e.flags |= 8192;
        else
          throw Dl = dr, Tu;
    } else e.flags &= -16777217;
  }
  function hh(e, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      e.flags &= -16777217;
    else if (e.flags |= 16777216, !Mm(t))
      if (Lh()) e.flags |= 8192;
      else
        throw Dl = dr, Tu;
  }
  function Tr(e, t) {
    t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag !== 22 ? Vf() : 536870912, e.lanes |= t, da |= t);
  }
  function li(e, t) {
    if (!ve)
      switch (e.tailMode) {
        case "hidden":
          t = e.tail;
          for (var n = null; t !== null; )
            t.alternate !== null && (n = t), t = t.sibling;
          n === null ? e.tail = null : n.sibling = null;
          break;
        case "collapsed":
          n = e.tail;
          for (var a = null; n !== null; )
            n.alternate !== null && (a = n), n = n.sibling;
          a === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : a.sibling = null;
      }
  }
  function He(e) {
    var t = e.alternate !== null && e.alternate.child === e.child, n = 0, a = 0;
    if (t)
      for (var r = e.child; r !== null; )
        n |= r.lanes | r.childLanes, a |= r.subtreeFlags & 65011712, a |= r.flags & 65011712, r.return = e, r = r.sibling;
    else
      for (r = e.child; r !== null; )
        n |= r.lanes | r.childLanes, a |= r.subtreeFlags, a |= r.flags, r.return = e, r = r.sibling;
    return e.subtreeFlags |= a, e.childLanes = n, t;
  }
  function X0(e, t, n) {
    var a = t.pendingProps;
    switch (bu(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return He(t), null;
      case 1:
        return He(t), null;
      case 3:
        return n = t.stateNode, a = null, e !== null && (a = e.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), On($e), Je(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (Il(t) ? Mn(t) : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, wu())), He(t), null;
      case 26:
        var r = t.type, u = t.memoizedState;
        return e === null ? (Mn(t), u !== null ? (He(t), hh(t, u)) : (He(t), dc(
          t,
          r,
          null,
          a,
          n
        ))) : u ? u !== e.memoizedState ? (Mn(t), He(t), hh(t, u)) : (He(t), t.flags &= -16777217) : (e = e.memoizedProps, e !== a && Mn(t), He(t), dc(
          t,
          r,
          e,
          a,
          n
        )), null;
      case 27:
        if (Le(t), n = Pe.current, r = t.type, e !== null && t.stateNode != null)
          e.memoizedProps !== a && Mn(t);
        else {
          if (!a) {
            if (t.stateNode === null)
              throw Error(c(166));
            return He(t), null;
          }
          e = ae.current, Il(t) ? Ko(t) : (e = bm(r, a, n), t.stateNode = e, Mn(t));
        }
        return He(t), null;
      case 5:
        if (Le(t), r = t.type, e !== null && t.stateNode != null)
          e.memoizedProps !== a && Mn(t);
        else {
          if (!a) {
            if (t.stateNode === null)
              throw Error(c(166));
            return He(t), null;
          }
          if (u = ae.current, Il(t))
            Ko(t);
          else {
            var f = Zr(
              Pe.current
            );
            switch (u) {
              case 1:
                u = f.createElementNS(
                  "http://www.w3.org/2000/svg",
                  r
                );
                break;
              case 2:
                u = f.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  r
                );
                break;
              default:
                switch (r) {
                  case "svg":
                    u = f.createElementNS(
                      "http://www.w3.org/2000/svg",
                      r
                    );
                    break;
                  case "math":
                    u = f.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      r
                    );
                    break;
                  case "script":
                    u = f.createElement("div"), u.innerHTML = "<script><\/script>", u = u.removeChild(
                      u.firstChild
                    );
                    break;
                  case "select":
                    u = typeof a.is == "string" ? f.createElement("select", {
                      is: a.is
                    }) : f.createElement("select"), a.multiple ? u.multiple = !0 : a.size && (u.size = a.size);
                    break;
                  default:
                    u = typeof a.is == "string" ? f.createElement(r, { is: a.is }) : f.createElement(r);
                }
            }
            u[ut] = t, u[bt] = a;
            e: for (f = t.child; f !== null; ) {
              if (f.tag === 5 || f.tag === 6)
                u.appendChild(f.stateNode);
              else if (f.tag !== 4 && f.tag !== 27 && f.child !== null) {
                f.child.return = f, f = f.child;
                continue;
              }
              if (f === t) break e;
              for (; f.sibling === null; ) {
                if (f.return === null || f.return === t)
                  break e;
                f = f.return;
              }
              f.sibling.return = f.return, f = f.sibling;
            }
            t.stateNode = u;
            e: switch (dt(u, r, a), r) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                a = !!a.autoFocus;
                break e;
              case "img":
                a = !0;
                break e;
              default:
                a = !1;
            }
            a && Mn(t);
          }
        }
        return He(t), dc(
          t,
          t.type,
          e === null ? null : e.memoizedProps,
          t.pendingProps,
          n
        ), null;
      case 6:
        if (e && t.stateNode != null)
          e.memoizedProps !== a && Mn(t);
        else {
          if (typeof a != "string" && t.stateNode === null)
            throw Error(c(166));
          if (e = Pe.current, Il(t)) {
            if (e = t.stateNode, n = t.memoizedProps, a = null, r = ct, r !== null)
              switch (r.tag) {
                case 27:
                case 5:
                  a = r.memoizedProps;
              }
            e[ut] = t, e = !!(e.nodeValue === n || a !== null && a.suppressHydrationWarning === !0 || cm(e.nodeValue, n)), e || Gn(t, !0);
          } else
            e = Zr(e).createTextNode(
              a
            ), e[ut] = t, t.stateNode = e;
        }
        return He(t), null;
      case 31:
        if (n = t.memoizedState, e === null || e.memoizedState !== null) {
          if (a = Il(t), n !== null) {
            if (e === null) {
              if (!a) throw Error(c(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(c(557));
              e[ut] = t;
            } else
              wl(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            He(t), e = !1;
          } else
            n = wu(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
          if (!e)
            return t.flags & 256 ? (Bt(t), t) : (Bt(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(c(558));
        }
        return He(t), null;
      case 13:
        if (a = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
          if (r = Il(t), a !== null && a.dehydrated !== null) {
            if (e === null) {
              if (!r) throw Error(c(318));
              if (r = t.memoizedState, r = r !== null ? r.dehydrated : null, !r) throw Error(c(317));
              r[ut] = t;
            } else
              wl(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            He(t), r = !1;
          } else
            r = wu(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = r), r = !0;
          if (!r)
            return t.flags & 256 ? (Bt(t), t) : (Bt(t), null);
        }
        return Bt(t), (t.flags & 128) !== 0 ? (t.lanes = n, t) : (n = a !== null, e = e !== null && e.memoizedState !== null, n && (a = t.child, r = null, a.alternate !== null && a.alternate.memoizedState !== null && a.alternate.memoizedState.cachePool !== null && (r = a.alternate.memoizedState.cachePool.pool), u = null, a.memoizedState !== null && a.memoizedState.cachePool !== null && (u = a.memoizedState.cachePool.pool), u !== r && (a.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), Tr(t, t.updateQueue), He(t), null);
      case 4:
        return Je(), e === null && jc(t.stateNode.containerInfo), He(t), null;
      case 10:
        return On(t.type), He(t), null;
      case 19:
        if (J(Ve), a = t.memoizedState, a === null) return He(t), null;
        if (r = (t.flags & 128) !== 0, u = a.rendering, u === null)
          if (r) li(a, !1);
          else {
            if (Qe !== 0 || e !== null && (e.flags & 128) !== 0)
              for (e = t.child; e !== null; ) {
                if (u = yr(e), u !== null) {
                  for (t.flags |= 128, li(a, !1), e = u.updateQueue, t.updateQueue = e, Tr(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null; )
                    Yo(n, e), n = n.sibling;
                  return ee(
                    Ve,
                    Ve.current & 1 | 2
                  ), ve && wn(t, a.treeForkCount), t.child;
                }
                e = e.sibling;
              }
            a.tail !== null && st() > jr && (t.flags |= 128, r = !0, li(a, !1), t.lanes = 4194304);
          }
        else {
          if (!r)
            if (e = yr(u), e !== null) {
              if (t.flags |= 128, r = !0, e = e.updateQueue, t.updateQueue = e, Tr(t, e), li(a, !0), a.tail === null && a.tailMode === "hidden" && !u.alternate && !ve)
                return He(t), null;
            } else
              2 * st() - a.renderingStartTime > jr && n !== 536870912 && (t.flags |= 128, r = !0, li(a, !1), t.lanes = 4194304);
          a.isBackwards ? (u.sibling = t.child, t.child = u) : (e = a.last, e !== null ? e.sibling = u : t.child = u, a.last = u);
        }
        return a.tail !== null ? (e = a.tail, a.rendering = e, a.tail = e.sibling, a.renderingStartTime = st(), e.sibling = null, n = Ve.current, ee(
          Ve,
          r ? n & 1 | 2 : n & 1
        ), ve && wn(t, a.treeForkCount), e) : (He(t), null);
      case 22:
      case 23:
        return Bt(t), Hu(), a = t.memoizedState !== null, e !== null ? e.memoizedState !== null !== a && (t.flags |= 8192) : a && (t.flags |= 8192), a ? (n & 536870912) !== 0 && (t.flags & 128) === 0 && (He(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : He(t), n = t.updateQueue, n !== null && Tr(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), a = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (a = t.memoizedState.cachePool.pool), a !== n && (t.flags |= 2048), e !== null && J(Rl), null;
      case 24:
        return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), On($e), He(t), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(c(156, t.tag));
  }
  function Y0(e, t) {
    switch (bu(t), t.tag) {
      case 1:
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 3:
        return On($e), Je(), e = t.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return Le(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (Bt(t), t.alternate === null)
            throw Error(c(340));
          wl();
        }
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 13:
        if (Bt(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(c(340));
          wl();
        }
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 19:
        return J(Ve), null;
      case 4:
        return Je(), null;
      case 10:
        return On(t.type), null;
      case 22:
      case 23:
        return Bt(t), Hu(), e !== null && J(Rl), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 24:
        return On($e), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function mh(e, t) {
    switch (bu(t), t.tag) {
      case 3:
        On($e), Je();
        break;
      case 26:
      case 27:
      case 5:
        Le(t);
        break;
      case 4:
        Je();
        break;
      case 31:
        t.memoizedState !== null && Bt(t);
        break;
      case 13:
        Bt(t);
        break;
      case 19:
        J(Ve);
        break;
      case 10:
        On(t.type);
        break;
      case 22:
      case 23:
        Bt(t), Hu(), e !== null && J(Rl);
        break;
      case 24:
        On($e);
    }
  }
  function ai(e, t) {
    try {
      var n = t.updateQueue, a = n !== null ? n.lastEffect : null;
      if (a !== null) {
        var r = a.next;
        n = r;
        do {
          if ((n.tag & e) === e) {
            a = void 0;
            var u = n.create, f = n.inst;
            a = u(), f.destroy = a;
          }
          n = n.next;
        } while (n !== r);
      }
    } catch (h) {
      De(t, t.return, h);
    }
  }
  function $n(e, t, n) {
    try {
      var a = t.updateQueue, r = a !== null ? a.lastEffect : null;
      if (r !== null) {
        var u = r.next;
        a = u;
        do {
          if ((a.tag & e) === e) {
            var f = a.inst, h = f.destroy;
            if (h !== void 0) {
              f.destroy = void 0, r = t;
              var y = n, R = h;
              try {
                R();
              } catch (M) {
                De(
                  r,
                  y,
                  M
                );
              }
            }
          }
          a = a.next;
        } while (a !== u);
      }
    } catch (M) {
      De(t, t.return, M);
    }
  }
  function ph(e) {
    var t = e.updateQueue;
    if (t !== null) {
      var n = e.stateNode;
      try {
        id(t, n);
      } catch (a) {
        De(e, e.return, a);
      }
    }
  }
  function yh(e, t, n) {
    n.props = Ul(
      e.type,
      e.memoizedProps
    ), n.state = e.memoizedState;
    try {
      n.componentWillUnmount();
    } catch (a) {
      De(e, t, a);
    }
  }
  function ii(e, t) {
    try {
      var n = e.ref;
      if (n !== null) {
        switch (e.tag) {
          case 26:
          case 27:
          case 5:
            var a = e.stateNode;
            break;
          case 30:
            a = e.stateNode;
            break;
          default:
            a = e.stateNode;
        }
        typeof n == "function" ? e.refCleanup = n(a) : n.current = a;
      }
    } catch (r) {
      De(e, t, r);
    }
  }
  function on(e, t) {
    var n = e.ref, a = e.refCleanup;
    if (n !== null)
      if (typeof a == "function")
        try {
          a();
        } catch (r) {
          De(e, t, r);
        } finally {
          e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
        }
      else if (typeof n == "function")
        try {
          n(null);
        } catch (r) {
          De(e, t, r);
        }
      else n.current = null;
  }
  function gh(e) {
    var t = e.type, n = e.memoizedProps, a = e.stateNode;
    try {
      e: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          n.autoFocus && a.focus();
          break e;
        case "img":
          n.src ? a.src = n.src : n.srcSet && (a.srcset = n.srcSet);
      }
    } catch (r) {
      De(e, e.return, r);
    }
  }
  function hc(e, t, n) {
    try {
      var a = e.stateNode;
      cv(a, e.type, n, t), a[bt] = t;
    } catch (r) {
      De(e, e.return, r);
    }
  }
  function vh(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && ll(e.type) || e.tag === 4;
  }
  function mc(e) {
    e: for (; ; ) {
      for (; e.sibling === null; ) {
        if (e.return === null || vh(e.return)) return null;
        e = e.return;
      }
      for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
        if (e.tag === 27 && ll(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue e;
        e.child.return = e, e = e.child;
      }
      if (!(e.flags & 2)) return e.stateNode;
    }
  }
  function pc(e, t, n) {
    var a = e.tag;
    if (a === 5 || a === 6)
      e = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(e, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(e), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = Sn));
    else if (a !== 4 && (a === 27 && ll(e.type) && (n = e.stateNode, t = null), e = e.child, e !== null))
      for (pc(e, t, n), e = e.sibling; e !== null; )
        pc(e, t, n), e = e.sibling;
  }
  function Ur(e, t, n) {
    var a = e.tag;
    if (a === 5 || a === 6)
      e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
    else if (a !== 4 && (a === 27 && ll(e.type) && (n = e.stateNode), e = e.child, e !== null))
      for (Ur(e, t, n), e = e.sibling; e !== null; )
        Ur(e, t, n), e = e.sibling;
  }
  function Sh(e) {
    var t = e.stateNode, n = e.memoizedProps;
    try {
      for (var a = e.type, r = t.attributes; r.length; )
        t.removeAttributeNode(r[0]);
      dt(t, a, n), t[ut] = e, t[bt] = n;
    } catch (u) {
      De(e, e.return, u);
    }
  }
  var Tn = !1, Ie = !1, yc = !1, bh = typeof WeakSet == "function" ? WeakSet : Set, it = null;
  function Q0(e, t) {
    if (e = e.containerInfo, _c = Wr, e = xo(e), cu(e)) {
      if ("selectionStart" in e)
        var n = {
          start: e.selectionStart,
          end: e.selectionEnd
        };
      else
        e: {
          n = (n = e.ownerDocument) && n.defaultView || window;
          var a = n.getSelection && n.getSelection();
          if (a && a.rangeCount !== 0) {
            n = a.anchorNode;
            var r = a.anchorOffset, u = a.focusNode;
            a = a.focusOffset;
            try {
              n.nodeType, u.nodeType;
            } catch {
              n = null;
              break e;
            }
            var f = 0, h = -1, y = -1, R = 0, M = 0, U = e, z = null;
            t: for (; ; ) {
              for (var D; U !== n || r !== 0 && U.nodeType !== 3 || (h = f + r), U !== u || a !== 0 && U.nodeType !== 3 || (y = f + a), U.nodeType === 3 && (f += U.nodeValue.length), (D = U.firstChild) !== null; )
                z = U, U = D;
              for (; ; ) {
                if (U === e) break t;
                if (z === n && ++R === r && (h = f), z === u && ++M === a && (y = f), (D = U.nextSibling) !== null) break;
                U = z, z = U.parentNode;
              }
              U = D;
            }
            n = h === -1 || y === -1 ? null : { start: h, end: y };
          } else n = null;
        }
      n = n || { start: 0, end: 0 };
    } else n = null;
    for (Cc = { focusedElem: e, selectionRange: n }, Wr = !1, it = t; it !== null; )
      if (t = it, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null)
        e.return = t, it = e;
      else
        for (; it !== null; ) {
          switch (t = it, u = t.alternate, e = t.flags, t.tag) {
            case 0:
              if ((e & 4) !== 0 && (e = t.updateQueue, e = e !== null ? e.events : null, e !== null))
                for (n = 0; n < e.length; n++)
                  r = e[n], r.ref.impl = r.nextImpl;
              break;
            case 11:
            case 15:
              break;
            case 1:
              if ((e & 1024) !== 0 && u !== null) {
                e = void 0, n = t, r = u.memoizedProps, u = u.memoizedState, a = n.stateNode;
                try {
                  var X = Ul(
                    n.type,
                    r
                  );
                  e = a.getSnapshotBeforeUpdate(
                    X,
                    u
                  ), a.__reactInternalSnapshotBeforeUpdate = e;
                } catch (k) {
                  De(
                    n,
                    n.return,
                    k
                  );
                }
              }
              break;
            case 3:
              if ((e & 1024) !== 0) {
                if (e = t.stateNode.containerInfo, n = e.nodeType, n === 9)
                  Yc(e);
                else if (n === 1)
                  switch (e.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      Yc(e);
                      break;
                    default:
                      e.textContent = "";
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if ((e & 1024) !== 0) throw Error(c(163));
          }
          if (e = t.sibling, e !== null) {
            e.return = t.return, it = e;
            break;
          }
          it = t.return;
        }
  }
  function Eh(e, t, n) {
    var a = n.flags;
    switch (n.tag) {
      case 0:
      case 11:
      case 15:
        Nn(e, n), a & 4 && ai(5, n);
        break;
      case 1:
        if (Nn(e, n), a & 4)
          if (e = n.stateNode, t === null)
            try {
              e.componentDidMount();
            } catch (f) {
              De(n, n.return, f);
            }
          else {
            var r = Ul(
              n.type,
              t.memoizedProps
            );
            t = t.memoizedState;
            try {
              e.componentDidUpdate(
                r,
                t,
                e.__reactInternalSnapshotBeforeUpdate
              );
            } catch (f) {
              De(
                n,
                n.return,
                f
              );
            }
          }
        a & 64 && ph(n), a & 512 && ii(n, n.return);
        break;
      case 3:
        if (Nn(e, n), a & 64 && (e = n.updateQueue, e !== null)) {
          if (t = null, n.child !== null)
            switch (n.child.tag) {
              case 27:
              case 5:
                t = n.child.stateNode;
                break;
              case 1:
                t = n.child.stateNode;
            }
          try {
            id(e, t);
          } catch (f) {
            De(n, n.return, f);
          }
        }
        break;
      case 27:
        t === null && a & 4 && Sh(n);
      case 26:
      case 5:
        Nn(e, n), t === null && a & 4 && gh(n), a & 512 && ii(n, n.return);
        break;
      case 12:
        Nn(e, n);
        break;
      case 31:
        Nn(e, n), a & 4 && Oh(e, n);
        break;
      case 13:
        Nn(e, n), a & 4 && Rh(e, n), a & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = W0.bind(
          null,
          n
        ), gv(e, n))));
        break;
      case 22:
        if (a = n.memoizedState !== null || Tn, !a) {
          t = t !== null && t.memoizedState !== null || Ie, r = Tn;
          var u = Ie;
          Tn = a, (Ie = t) && !u ? xn(
            e,
            n,
            (n.subtreeFlags & 8772) !== 0
          ) : Nn(e, n), Tn = r, Ie = u;
        }
        break;
      case 30:
        break;
      default:
        Nn(e, n);
    }
  }
  function wh(e) {
    var t = e.alternate;
    t !== null && (e.alternate = null, wh(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && Ks(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
  }
  var Ce = null, wt = !1;
  function Un(e, t, n) {
    for (n = n.child; n !== null; )
      Ah(e, t, n), n = n.sibling;
  }
  function Ah(e, t, n) {
    if (Nt && typeof Nt.onCommitFiberUnmount == "function")
      try {
        Nt.onCommitFiberUnmount(Ta, n);
      } catch {
      }
    switch (n.tag) {
      case 26:
        Ie || on(n, t), Un(
          e,
          t,
          n
        ), n.memoizedState ? n.memoizedState.count-- : n.stateNode && (n = n.stateNode, n.parentNode.removeChild(n));
        break;
      case 27:
        Ie || on(n, t);
        var a = Ce, r = wt;
        ll(n.type) && (Ce = n.stateNode, wt = !1), Un(
          e,
          t,
          n
        ), mi(n.stateNode), Ce = a, wt = r;
        break;
      case 5:
        Ie || on(n, t);
      case 6:
        if (a = Ce, r = wt, Ce = null, Un(
          e,
          t,
          n
        ), Ce = a, wt = r, Ce !== null)
          if (wt)
            try {
              (Ce.nodeType === 9 ? Ce.body : Ce.nodeName === "HTML" ? Ce.ownerDocument.body : Ce).removeChild(n.stateNode);
            } catch (u) {
              De(
                n,
                t,
                u
              );
            }
          else
            try {
              Ce.removeChild(n.stateNode);
            } catch (u) {
              De(
                n,
                t,
                u
              );
            }
        break;
      case 18:
        Ce !== null && (wt ? (e = Ce, pm(
          e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e,
          n.stateNode
        ), ba(e)) : pm(Ce, n.stateNode));
        break;
      case 4:
        a = Ce, r = wt, Ce = n.stateNode.containerInfo, wt = !0, Un(
          e,
          t,
          n
        ), Ce = a, wt = r;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        $n(2, n, t), Ie || $n(4, n, t), Un(
          e,
          t,
          n
        );
        break;
      case 1:
        Ie || (on(n, t), a = n.stateNode, typeof a.componentWillUnmount == "function" && yh(
          n,
          t,
          a
        )), Un(
          e,
          t,
          n
        );
        break;
      case 21:
        Un(
          e,
          t,
          n
        );
        break;
      case 22:
        Ie = (a = Ie) || n.memoizedState !== null, Un(
          e,
          t,
          n
        ), Ie = a;
        break;
      default:
        Un(
          e,
          t,
          n
        );
    }
  }
  function Oh(e, t) {
    if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
      e = e.dehydrated;
      try {
        ba(e);
      } catch (n) {
        De(t, t.return, n);
      }
    }
  }
  function Rh(e, t) {
    if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null))))
      try {
        ba(e);
      } catch (n) {
        De(t, t.return, n);
      }
  }
  function G0(e) {
    switch (e.tag) {
      case 31:
      case 13:
      case 19:
        var t = e.stateNode;
        return t === null && (t = e.stateNode = new bh()), t;
      case 22:
        return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new bh()), t;
      default:
        throw Error(c(435, e.tag));
    }
  }
  function Nr(e, t) {
    var n = G0(e);
    t.forEach(function(a) {
      if (!n.has(a)) {
        n.add(a);
        var r = k0.bind(null, e, a);
        a.then(r, r);
      }
    });
  }
  function At(e, t) {
    var n = t.deletions;
    if (n !== null)
      for (var a = 0; a < n.length; a++) {
        var r = n[a], u = e, f = t, h = f;
        e: for (; h !== null; ) {
          switch (h.tag) {
            case 27:
              if (ll(h.type)) {
                Ce = h.stateNode, wt = !1;
                break e;
              }
              break;
            case 5:
              Ce = h.stateNode, wt = !1;
              break e;
            case 3:
            case 4:
              Ce = h.stateNode.containerInfo, wt = !0;
              break e;
          }
          h = h.return;
        }
        if (Ce === null) throw Error(c(160));
        Ah(u, f, r), Ce = null, wt = !1, u = r.alternate, u !== null && (u.return = null), r.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        zh(t, e), t = t.sibling;
  }
  var ln = null;
  function zh(e, t) {
    var n = e.alternate, a = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        At(t, e), Ot(e), a & 4 && ($n(3, e, e.return), ai(3, e), $n(5, e, e.return));
        break;
      case 1:
        At(t, e), Ot(e), a & 512 && (Ie || n === null || on(n, n.return)), a & 64 && Tn && (e = e.updateQueue, e !== null && (a = e.callbacks, a !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? a : n.concat(a))));
        break;
      case 26:
        var r = ln;
        if (At(t, e), Ot(e), a & 512 && (Ie || n === null || on(n, n.return)), a & 4) {
          var u = n !== null ? n.memoizedState : null;
          if (a = e.memoizedState, n === null)
            if (a === null)
              if (e.stateNode === null) {
                e: {
                  a = e.type, n = e.memoizedProps, r = r.ownerDocument || r;
                  t: switch (a) {
                    case "title":
                      u = r.getElementsByTagName("title")[0], (!u || u[xa] || u[ut] || u.namespaceURI === "http://www.w3.org/2000/svg" || u.hasAttribute("itemprop")) && (u = r.createElement(a), r.head.insertBefore(
                        u,
                        r.querySelector("head > title")
                      )), dt(u, a, n), u[ut] = e, at(u), a = u;
                      break e;
                    case "link":
                      var f = zm(
                        "link",
                        "href",
                        r
                      ).get(a + (n.href || ""));
                      if (f) {
                        for (var h = 0; h < f.length; h++)
                          if (u = f[h], u.getAttribute("href") === (n.href == null || n.href === "" ? null : n.href) && u.getAttribute("rel") === (n.rel == null ? null : n.rel) && u.getAttribute("title") === (n.title == null ? null : n.title) && u.getAttribute("crossorigin") === (n.crossOrigin == null ? null : n.crossOrigin)) {
                            f.splice(h, 1);
                            break t;
                          }
                      }
                      u = r.createElement(a), dt(u, a, n), r.head.appendChild(u);
                      break;
                    case "meta":
                      if (f = zm(
                        "meta",
                        "content",
                        r
                      ).get(a + (n.content || ""))) {
                        for (h = 0; h < f.length; h++)
                          if (u = f[h], u.getAttribute("content") === (n.content == null ? null : "" + n.content) && u.getAttribute("name") === (n.name == null ? null : n.name) && u.getAttribute("property") === (n.property == null ? null : n.property) && u.getAttribute("http-equiv") === (n.httpEquiv == null ? null : n.httpEquiv) && u.getAttribute("charset") === (n.charSet == null ? null : n.charSet)) {
                            f.splice(h, 1);
                            break t;
                          }
                      }
                      u = r.createElement(a), dt(u, a, n), r.head.appendChild(u);
                      break;
                    default:
                      throw Error(c(468, a));
                  }
                  u[ut] = e, at(u), a = u;
                }
                e.stateNode = a;
              } else
                Dm(
                  r,
                  e.type,
                  e.stateNode
                );
            else
              e.stateNode = Rm(
                r,
                a,
                e.memoizedProps
              );
          else
            u !== a ? (u === null ? n.stateNode !== null && (n = n.stateNode, n.parentNode.removeChild(n)) : u.count--, a === null ? Dm(
              r,
              e.type,
              e.stateNode
            ) : Rm(
              r,
              a,
              e.memoizedProps
            )) : a === null && e.stateNode !== null && hc(
              e,
              e.memoizedProps,
              n.memoizedProps
            );
        }
        break;
      case 27:
        At(t, e), Ot(e), a & 512 && (Ie || n === null || on(n, n.return)), n !== null && a & 4 && hc(
          e,
          e.memoizedProps,
          n.memoizedProps
        );
        break;
      case 5:
        if (At(t, e), Ot(e), a & 512 && (Ie || n === null || on(n, n.return)), e.flags & 32) {
          r = e.stateNode;
          try {
            Gl(r, "");
          } catch (X) {
            De(e, e.return, X);
          }
        }
        a & 4 && e.stateNode != null && (r = e.memoizedProps, hc(
          e,
          r,
          n !== null ? n.memoizedProps : r
        )), a & 1024 && (yc = !0);
        break;
      case 6:
        if (At(t, e), Ot(e), a & 4) {
          if (e.stateNode === null)
            throw Error(c(162));
          a = e.memoizedProps, n = e.stateNode;
          try {
            n.nodeValue = a;
          } catch (X) {
            De(e, e.return, X);
          }
        }
        break;
      case 3:
        if (Pr = null, r = ln, ln = Vr(t.containerInfo), At(t, e), ln = r, Ot(e), a & 4 && n !== null && n.memoizedState.isDehydrated)
          try {
            ba(t.containerInfo);
          } catch (X) {
            De(e, e.return, X);
          }
        yc && (yc = !1, Dh(e));
        break;
      case 4:
        a = ln, ln = Vr(
          e.stateNode.containerInfo
        ), At(t, e), Ot(e), ln = a;
        break;
      case 12:
        At(t, e), Ot(e);
        break;
      case 31:
        At(t, e), Ot(e), a & 4 && (a = e.updateQueue, a !== null && (e.updateQueue = null, Nr(e, a)));
        break;
      case 13:
        At(t, e), Ot(e), e.child.flags & 8192 && e.memoizedState !== null != (n !== null && n.memoizedState !== null) && (qr = st()), a & 4 && (a = e.updateQueue, a !== null && (e.updateQueue = null, Nr(e, a)));
        break;
      case 22:
        r = e.memoizedState !== null;
        var y = n !== null && n.memoizedState !== null, R = Tn, M = Ie;
        if (Tn = R || r, Ie = M || y, At(t, e), Ie = M, Tn = R, Ot(e), a & 8192)
          e: for (t = e.stateNode, t._visibility = r ? t._visibility & -2 : t._visibility | 1, r && (n === null || y || Tn || Ie || Nl(e)), n = null, t = e; ; ) {
            if (t.tag === 5 || t.tag === 26) {
              if (n === null) {
                y = n = t;
                try {
                  if (u = y.stateNode, r)
                    f = u.style, typeof f.setProperty == "function" ? f.setProperty("display", "none", "important") : f.display = "none";
                  else {
                    h = y.stateNode;
                    var U = y.memoizedProps.style, z = U != null && U.hasOwnProperty("display") ? U.display : null;
                    h.style.display = z == null || typeof z == "boolean" ? "" : ("" + z).trim();
                  }
                } catch (X) {
                  De(y, y.return, X);
                }
              }
            } else if (t.tag === 6) {
              if (n === null) {
                y = t;
                try {
                  y.stateNode.nodeValue = r ? "" : y.memoizedProps;
                } catch (X) {
                  De(y, y.return, X);
                }
              }
            } else if (t.tag === 18) {
              if (n === null) {
                y = t;
                try {
                  var D = y.stateNode;
                  r ? ym(D, !0) : ym(y.stateNode, !1);
                } catch (X) {
                  De(y, y.return, X);
                }
              }
            } else if ((t.tag !== 22 && t.tag !== 23 || t.memoizedState === null || t === e) && t.child !== null) {
              t.child.return = t, t = t.child;
              continue;
            }
            if (t === e) break e;
            for (; t.sibling === null; ) {
              if (t.return === null || t.return === e) break e;
              n === t && (n = null), t = t.return;
            }
            n === t && (n = null), t.sibling.return = t.return, t = t.sibling;
          }
        a & 4 && (a = e.updateQueue, a !== null && (n = a.retryQueue, n !== null && (a.retryQueue = null, Nr(e, n))));
        break;
      case 19:
        At(t, e), Ot(e), a & 4 && (a = e.updateQueue, a !== null && (e.updateQueue = null, Nr(e, a)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        At(t, e), Ot(e);
    }
  }
  function Ot(e) {
    var t = e.flags;
    if (t & 2) {
      try {
        for (var n, a = e.return; a !== null; ) {
          if (vh(a)) {
            n = a;
            break;
          }
          a = a.return;
        }
        if (n == null) throw Error(c(160));
        switch (n.tag) {
          case 27:
            var r = n.stateNode, u = mc(e);
            Ur(e, u, r);
            break;
          case 5:
            var f = n.stateNode;
            n.flags & 32 && (Gl(f, ""), n.flags &= -33);
            var h = mc(e);
            Ur(e, h, f);
            break;
          case 3:
          case 4:
            var y = n.stateNode.containerInfo, R = mc(e);
            pc(
              e,
              R,
              y
            );
            break;
          default:
            throw Error(c(161));
        }
      } catch (M) {
        De(e, e.return, M);
      }
      e.flags &= -3;
    }
    t & 4096 && (e.flags &= -4097);
  }
  function Dh(e) {
    if (e.subtreeFlags & 1024)
      for (e = e.child; e !== null; ) {
        var t = e;
        Dh(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), e = e.sibling;
      }
  }
  function Nn(e, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        Eh(e, t.alternate, t), t = t.sibling;
  }
  function Nl(e) {
    for (e = e.child; e !== null; ) {
      var t = e;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          $n(4, t, t.return), Nl(t);
          break;
        case 1:
          on(t, t.return);
          var n = t.stateNode;
          typeof n.componentWillUnmount == "function" && yh(
            t,
            t.return,
            n
          ), Nl(t);
          break;
        case 27:
          mi(t.stateNode);
        case 26:
        case 5:
          on(t, t.return), Nl(t);
          break;
        case 22:
          t.memoizedState === null && Nl(t);
          break;
        case 30:
          Nl(t);
          break;
        default:
          Nl(t);
      }
      e = e.sibling;
    }
  }
  function xn(e, t, n) {
    for (n = n && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var a = t.alternate, r = e, u = t, f = u.flags;
      switch (u.tag) {
        case 0:
        case 11:
        case 15:
          xn(
            r,
            u,
            n
          ), ai(4, u);
          break;
        case 1:
          if (xn(
            r,
            u,
            n
          ), a = u, r = a.stateNode, typeof r.componentDidMount == "function")
            try {
              r.componentDidMount();
            } catch (R) {
              De(a, a.return, R);
            }
          if (a = u, r = a.updateQueue, r !== null) {
            var h = a.stateNode;
            try {
              var y = r.shared.hiddenCallbacks;
              if (y !== null)
                for (r.shared.hiddenCallbacks = null, r = 0; r < y.length; r++)
                  ad(y[r], h);
            } catch (R) {
              De(a, a.return, R);
            }
          }
          n && f & 64 && ph(u), ii(u, u.return);
          break;
        case 27:
          Sh(u);
        case 26:
        case 5:
          xn(
            r,
            u,
            n
          ), n && a === null && f & 4 && gh(u), ii(u, u.return);
          break;
        case 12:
          xn(
            r,
            u,
            n
          );
          break;
        case 31:
          xn(
            r,
            u,
            n
          ), n && f & 4 && Oh(r, u);
          break;
        case 13:
          xn(
            r,
            u,
            n
          ), n && f & 4 && Rh(r, u);
          break;
        case 22:
          u.memoizedState === null && xn(
            r,
            u,
            n
          ), ii(u, u.return);
          break;
        case 30:
          break;
        default:
          xn(
            r,
            u,
            n
          );
      }
      t = t.sibling;
    }
  }
  function gc(e, t) {
    var n = null;
    e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && Va(n));
  }
  function vc(e, t) {
    e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && Va(e));
  }
  function an(e, t, n, a) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; )
        Mh(
          e,
          t,
          n,
          a
        ), t = t.sibling;
  }
  function Mh(e, t, n, a) {
    var r = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        an(
          e,
          t,
          n,
          a
        ), r & 2048 && ai(9, t);
        break;
      case 1:
        an(
          e,
          t,
          n,
          a
        );
        break;
      case 3:
        an(
          e,
          t,
          n,
          a
        ), r & 2048 && (e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && Va(e)));
        break;
      case 12:
        if (r & 2048) {
          an(
            e,
            t,
            n,
            a
          ), e = t.stateNode;
          try {
            var u = t.memoizedProps, f = u.id, h = u.onPostCommit;
            typeof h == "function" && h(
              f,
              t.alternate === null ? "mount" : "update",
              e.passiveEffectDuration,
              -0
            );
          } catch (y) {
            De(t, t.return, y);
          }
        } else
          an(
            e,
            t,
            n,
            a
          );
        break;
      case 31:
        an(
          e,
          t,
          n,
          a
        );
        break;
      case 13:
        an(
          e,
          t,
          n,
          a
        );
        break;
      case 23:
        break;
      case 22:
        u = t.stateNode, f = t.alternate, t.memoizedState !== null ? u._visibility & 2 ? an(
          e,
          t,
          n,
          a
        ) : ri(e, t) : u._visibility & 2 ? an(
          e,
          t,
          n,
          a
        ) : (u._visibility |= 2, ca(
          e,
          t,
          n,
          a,
          (t.subtreeFlags & 10256) !== 0 || !1
        )), r & 2048 && gc(f, t);
        break;
      case 24:
        an(
          e,
          t,
          n,
          a
        ), r & 2048 && vc(t.alternate, t);
        break;
      default:
        an(
          e,
          t,
          n,
          a
        );
    }
  }
  function ca(e, t, n, a, r) {
    for (r = r && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var u = e, f = t, h = n, y = a, R = f.flags;
      switch (f.tag) {
        case 0:
        case 11:
        case 15:
          ca(
            u,
            f,
            h,
            y,
            r
          ), ai(8, f);
          break;
        case 23:
          break;
        case 22:
          var M = f.stateNode;
          f.memoizedState !== null ? M._visibility & 2 ? ca(
            u,
            f,
            h,
            y,
            r
          ) : ri(
            u,
            f
          ) : (M._visibility |= 2, ca(
            u,
            f,
            h,
            y,
            r
          )), r && R & 2048 && gc(
            f.alternate,
            f
          );
          break;
        case 24:
          ca(
            u,
            f,
            h,
            y,
            r
          ), r && R & 2048 && vc(f.alternate, f);
          break;
        default:
          ca(
            u,
            f,
            h,
            y,
            r
          );
      }
      t = t.sibling;
    }
  }
  function ri(e, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var n = e, a = t, r = a.flags;
        switch (a.tag) {
          case 22:
            ri(n, a), r & 2048 && gc(
              a.alternate,
              a
            );
            break;
          case 24:
            ri(n, a), r & 2048 && vc(a.alternate, a);
            break;
          default:
            ri(n, a);
        }
        t = t.sibling;
      }
  }
  var si = 8192;
  function fa(e, t, n) {
    if (e.subtreeFlags & si)
      for (e = e.child; e !== null; )
        Th(
          e,
          t,
          n
        ), e = e.sibling;
  }
  function Th(e, t, n) {
    switch (e.tag) {
      case 26:
        fa(
          e,
          t,
          n
        ), e.flags & si && e.memoizedState !== null && Tv(
          n,
          ln,
          e.memoizedState,
          e.memoizedProps
        );
        break;
      case 5:
        fa(
          e,
          t,
          n
        );
        break;
      case 3:
      case 4:
        var a = ln;
        ln = Vr(e.stateNode.containerInfo), fa(
          e,
          t,
          n
        ), ln = a;
        break;
      case 22:
        e.memoizedState === null && (a = e.alternate, a !== null && a.memoizedState !== null ? (a = si, si = 16777216, fa(
          e,
          t,
          n
        ), si = a) : fa(
          e,
          t,
          n
        ));
        break;
      default:
        fa(
          e,
          t,
          n
        );
    }
  }
  function Uh(e) {
    var t = e.alternate;
    if (t !== null && (e = t.child, e !== null)) {
      t.child = null;
      do
        t = e.sibling, e.sibling = null, e = t;
      while (e !== null);
    }
  }
  function ui(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var n = 0; n < t.length; n++) {
          var a = t[n];
          it = a, xh(
            a,
            e
          );
        }
      Uh(e);
    }
    if (e.subtreeFlags & 10256)
      for (e = e.child; e !== null; )
        Nh(e), e = e.sibling;
  }
  function Nh(e) {
    switch (e.tag) {
      case 0:
      case 11:
      case 15:
        ui(e), e.flags & 2048 && $n(9, e, e.return);
        break;
      case 3:
        ui(e);
        break;
      case 12:
        ui(e);
        break;
      case 22:
        var t = e.stateNode;
        e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, xr(e)) : ui(e);
        break;
      default:
        ui(e);
    }
  }
  function xr(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var n = 0; n < t.length; n++) {
          var a = t[n];
          it = a, xh(
            a,
            e
          );
        }
      Uh(e);
    }
    for (e = e.child; e !== null; ) {
      switch (t = e, t.tag) {
        case 0:
        case 11:
        case 15:
          $n(8, t, t.return), xr(t);
          break;
        case 22:
          n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, xr(t));
          break;
        default:
          xr(t);
      }
      e = e.sibling;
    }
  }
  function xh(e, t) {
    for (; it !== null; ) {
      var n = it;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          $n(8, n, t);
          break;
        case 23:
        case 22:
          if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
            var a = n.memoizedState.cachePool.pool;
            a != null && a.refCount++;
          }
          break;
        case 24:
          Va(n.memoizedState.cache);
      }
      if (a = n.child, a !== null) a.return = n, it = a;
      else
        e: for (n = e; it !== null; ) {
          a = it;
          var r = a.sibling, u = a.return;
          if (wh(a), a === n) {
            it = null;
            break e;
          }
          if (r !== null) {
            r.return = u, it = r;
            break e;
          }
          it = u;
        }
    }
  }
  var Z0 = {
    getCacheForType: function(e) {
      var t = ft($e), n = t.data.get(e);
      return n === void 0 && (n = e(), t.data.set(e, n)), n;
    },
    cacheSignal: function() {
      return ft($e).controller.signal;
    }
  }, V0 = typeof WeakMap == "function" ? WeakMap : Map, Re = 0, xe = null, de = null, pe = 0, ze = 0, _t = null, Wn = !1, oa = !1, Sc = !1, qn = 0, Qe = 0, kn = 0, xl = 0, bc = 0, Ct = 0, da = 0, ci = null, Rt = null, Ec = !1, qr = 0, qh = 0, jr = 1 / 0, Hr = null, In = null, lt = 0, el = null, ha = null, jn = 0, wc = 0, Ac = null, jh = null, fi = 0, Oc = null;
  function Lt() {
    return (Re & 2) !== 0 && pe !== 0 ? pe & -pe : b.T !== null ? Uc() : Ff();
  }
  function Hh() {
    if (Ct === 0)
      if ((pe & 536870912) === 0 || ve) {
        var e = Gi;
        Gi <<= 1, (Gi & 3932160) === 0 && (Gi = 262144), Ct = e;
      } else Ct = 536870912;
    return e = Ht.current, e !== null && (e.flags |= 32), Ct;
  }
  function zt(e, t, n) {
    (e === xe && (ze === 2 || ze === 9) || e.cancelPendingCommit !== null) && (ma(e, 0), tl(
      e,
      pe,
      Ct,
      !1
    )), Na(e, n), ((Re & 2) === 0 || e !== xe) && (e === xe && ((Re & 2) === 0 && (xl |= n), Qe === 4 && tl(
      e,
      pe,
      Ct,
      !1
    )), dn(e));
  }
  function Bh(e, t, n) {
    if ((Re & 6) !== 0) throw Error(c(327));
    var a = !n && (t & 127) === 0 && (t & e.expiredLanes) === 0 || Ua(e, t), r = a ? J0(e, t) : zc(e, t, !0), u = a;
    do {
      if (r === 0) {
        oa && !a && tl(e, t, 0, !1);
        break;
      } else {
        if (n = e.current.alternate, u && !K0(n)) {
          r = zc(e, t, !1), u = !1;
          continue;
        }
        if (r === 2) {
          if (u = t, e.errorRecoveryDisabledLanes & u)
            var f = 0;
          else
            f = e.pendingLanes & -536870913, f = f !== 0 ? f : f & 536870912 ? 536870912 : 0;
          if (f !== 0) {
            t = f;
            e: {
              var h = e;
              r = ci;
              var y = h.current.memoizedState.isDehydrated;
              if (y && (ma(h, f).flags |= 256), f = zc(
                h,
                f,
                !1
              ), f !== 2) {
                if (Sc && !y) {
                  h.errorRecoveryDisabledLanes |= u, xl |= u, r = 4;
                  break e;
                }
                u = Rt, Rt = r, u !== null && (Rt === null ? Rt = u : Rt.push.apply(
                  Rt,
                  u
                ));
              }
              r = f;
            }
            if (u = !1, r !== 2) continue;
          }
        }
        if (r === 1) {
          ma(e, 0), tl(e, t, 0, !0);
          break;
        }
        e: {
          switch (a = e, u = r, u) {
            case 0:
            case 1:
              throw Error(c(345));
            case 4:
              if ((t & 4194048) !== t) break;
            case 6:
              tl(
                a,
                t,
                Ct,
                !Wn
              );
              break e;
            case 2:
              Rt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(c(329));
          }
          if ((t & 62914560) === t && (r = qr + 300 - st(), 10 < r)) {
            if (tl(
              a,
              t,
              Ct,
              !Wn
            ), Vi(a, 0, !0) !== 0) break e;
            jn = t, a.timeoutHandle = hm(
              _h.bind(
                null,
                a,
                n,
                Rt,
                Hr,
                Ec,
                t,
                Ct,
                xl,
                da,
                Wn,
                u,
                "Throttled",
                -0,
                0
              ),
              r
            );
            break e;
          }
          _h(
            a,
            n,
            Rt,
            Hr,
            Ec,
            t,
            Ct,
            xl,
            da,
            Wn,
            u,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    dn(e);
  }
  function _h(e, t, n, a, r, u, f, h, y, R, M, U, z, D) {
    if (e.timeoutHandle = -1, U = t.subtreeFlags, U & 8192 || (U & 16785408) === 16785408) {
      U = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: Sn
      }, Th(
        t,
        u,
        U
      );
      var X = (u & 62914560) === u ? qr - st() : (u & 4194048) === u ? qh - st() : 0;
      if (X = Uv(
        U,
        X
      ), X !== null) {
        jn = u, e.cancelPendingCommit = X(
          Vh.bind(
            null,
            e,
            t,
            u,
            n,
            a,
            r,
            f,
            h,
            y,
            M,
            U,
            null,
            z,
            D
          )
        ), tl(e, u, f, !R);
        return;
      }
    }
    Vh(
      e,
      t,
      u,
      n,
      a,
      r,
      f,
      h,
      y
    );
  }
  function K0(e) {
    for (var t = e; ; ) {
      var n = t.tag;
      if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null)))
        for (var a = 0; a < n.length; a++) {
          var r = n[a], u = r.getSnapshot;
          r = r.value;
          try {
            if (!qt(u(), r)) return !1;
          } catch {
            return !1;
          }
        }
      if (n = t.child, t.subtreeFlags & 16384 && n !== null)
        n.return = t, t = n;
      else {
        if (t === e) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === e) return !0;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    }
    return !0;
  }
  function tl(e, t, n, a) {
    t &= ~bc, t &= ~xl, e.suspendedLanes |= t, e.pingedLanes &= ~t, a && (e.warmLanes |= t), a = e.expirationTimes;
    for (var r = t; 0 < r; ) {
      var u = 31 - xt(r), f = 1 << u;
      a[u] = -1, r &= ~f;
    }
    n !== 0 && Kf(e, n, t);
  }
  function Br() {
    return (Re & 6) === 0 ? (oi(0), !1) : !0;
  }
  function Rc() {
    if (de !== null) {
      if (ze === 0)
        var e = de.return;
      else
        e = de, An = Al = null, Yu(e), aa = null, Pa = 0, e = de;
      for (; e !== null; )
        mh(e.alternate, e), e = e.return;
      de = null;
    }
  }
  function ma(e, t) {
    var n = e.timeoutHandle;
    n !== -1 && (e.timeoutHandle = -1, dv(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), jn = 0, Rc(), xe = e, de = n = En(e.current, null), pe = t, ze = 0, _t = null, Wn = !1, oa = Ua(e, t), Sc = !1, da = Ct = bc = xl = kn = Qe = 0, Rt = ci = null, Ec = !1, (t & 8) !== 0 && (t |= t & 32);
    var a = e.entangledLanes;
    if (a !== 0)
      for (e = e.entanglements, a &= t; 0 < a; ) {
        var r = 31 - xt(a), u = 1 << r;
        t |= e[r], a &= ~u;
      }
    return qn = t, lr(), n;
  }
  function Ch(e, t) {
    re = null, b.H = ti, t === la || t === or ? (t = ed(), ze = 3) : t === Tu ? (t = ed(), ze = 4) : ze = t === lc ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, _t = t, de === null && (Qe = 1, Rr(
      e,
      Kt(t, e.current)
    ));
  }
  function Lh() {
    var e = Ht.current;
    return e === null ? !0 : (pe & 4194048) === pe ? $t === null : (pe & 62914560) === pe || (pe & 536870912) !== 0 ? e === $t : !1;
  }
  function Xh() {
    var e = b.H;
    return b.H = ti, e === null ? ti : e;
  }
  function Yh() {
    var e = b.A;
    return b.A = Z0, e;
  }
  function _r() {
    Qe = 4, Wn || (pe & 4194048) !== pe && Ht.current !== null || (oa = !0), (kn & 134217727) === 0 && (xl & 134217727) === 0 || xe === null || tl(
      xe,
      pe,
      Ct,
      !1
    );
  }
  function zc(e, t, n) {
    var a = Re;
    Re |= 2;
    var r = Xh(), u = Yh();
    (xe !== e || pe !== t) && (Hr = null, ma(e, t)), t = !1;
    var f = Qe;
    e: do
      try {
        if (ze !== 0 && de !== null) {
          var h = de, y = _t;
          switch (ze) {
            case 8:
              Rc(), f = 6;
              break e;
            case 3:
            case 2:
            case 9:
            case 6:
              Ht.current === null && (t = !0);
              var R = ze;
              if (ze = 0, _t = null, pa(e, h, y, R), n && oa) {
                f = 0;
                break e;
              }
              break;
            default:
              R = ze, ze = 0, _t = null, pa(e, h, y, R);
          }
        }
        P0(), f = Qe;
        break;
      } catch (M) {
        Ch(e, M);
      }
    while (!0);
    return t && e.shellSuspendCounter++, An = Al = null, Re = a, b.H = r, b.A = u, de === null && (xe = null, pe = 0, lr()), f;
  }
  function P0() {
    for (; de !== null; ) Qh(de);
  }
  function J0(e, t) {
    var n = Re;
    Re |= 2;
    var a = Xh(), r = Yh();
    xe !== e || pe !== t ? (Hr = null, jr = st() + 500, ma(e, t)) : oa = Ua(
      e,
      t
    );
    e: do
      try {
        if (ze !== 0 && de !== null) {
          t = de;
          var u = _t;
          t: switch (ze) {
            case 1:
              ze = 0, _t = null, pa(e, t, u, 1);
              break;
            case 2:
            case 9:
              if (ko(u)) {
                ze = 0, _t = null, Gh(t);
                break;
              }
              t = function() {
                ze !== 2 && ze !== 9 || xe !== e || (ze = 7), dn(e);
              }, u.then(t, t);
              break e;
            case 3:
              ze = 7;
              break e;
            case 4:
              ze = 5;
              break e;
            case 7:
              ko(u) ? (ze = 0, _t = null, Gh(t)) : (ze = 0, _t = null, pa(e, t, u, 7));
              break;
            case 5:
              var f = null;
              switch (de.tag) {
                case 26:
                  f = de.memoizedState;
                case 5:
                case 27:
                  var h = de;
                  if (f ? Mm(f) : h.stateNode.complete) {
                    ze = 0, _t = null;
                    var y = h.sibling;
                    if (y !== null) de = y;
                    else {
                      var R = h.return;
                      R !== null ? (de = R, Cr(R)) : de = null;
                    }
                    break t;
                  }
              }
              ze = 0, _t = null, pa(e, t, u, 5);
              break;
            case 6:
              ze = 0, _t = null, pa(e, t, u, 6);
              break;
            case 8:
              Rc(), Qe = 6;
              break e;
            default:
              throw Error(c(462));
          }
        }
        F0();
        break;
      } catch (M) {
        Ch(e, M);
      }
    while (!0);
    return An = Al = null, b.H = a, b.A = r, Re = n, de !== null ? 0 : (xe = null, pe = 0, lr(), Qe);
  }
  function F0() {
    for (; de !== null && !St(); )
      Qh(de);
  }
  function Qh(e) {
    var t = dh(e.alternate, e, qn);
    e.memoizedProps = e.pendingProps, t === null ? Cr(e) : de = t;
  }
  function Gh(e) {
    var t = e, n = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = rh(
          n,
          t,
          t.pendingProps,
          t.type,
          void 0,
          pe
        );
        break;
      case 11:
        t = rh(
          n,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          pe
        );
        break;
      case 5:
        Yu(t);
      default:
        mh(n, t), t = de = Yo(t, qn), t = dh(n, t, qn);
    }
    e.memoizedProps = e.pendingProps, t === null ? Cr(e) : de = t;
  }
  function pa(e, t, n, a) {
    An = Al = null, Yu(t), aa = null, Pa = 0;
    var r = t.return;
    try {
      if (_0(
        e,
        r,
        t,
        n,
        pe
      )) {
        Qe = 1, Rr(
          e,
          Kt(n, e.current)
        ), de = null;
        return;
      }
    } catch (u) {
      if (r !== null) throw de = r, u;
      Qe = 1, Rr(
        e,
        Kt(n, e.current)
      ), de = null;
      return;
    }
    t.flags & 32768 ? (ve || a === 1 ? e = !0 : oa || (pe & 536870912) !== 0 ? e = !1 : (Wn = e = !0, (a === 2 || a === 9 || a === 3 || a === 6) && (a = Ht.current, a !== null && a.tag === 13 && (a.flags |= 16384))), Zh(t, e)) : Cr(t);
  }
  function Cr(e) {
    var t = e;
    do {
      if ((t.flags & 32768) !== 0) {
        Zh(
          t,
          Wn
        );
        return;
      }
      e = t.return;
      var n = X0(
        t.alternate,
        t,
        qn
      );
      if (n !== null) {
        de = n;
        return;
      }
      if (t = t.sibling, t !== null) {
        de = t;
        return;
      }
      de = t = e;
    } while (t !== null);
    Qe === 0 && (Qe = 5);
  }
  function Zh(e, t) {
    do {
      var n = Y0(e.alternate, e);
      if (n !== null) {
        n.flags &= 32767, de = n;
        return;
      }
      if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
        de = e;
        return;
      }
      de = e = n;
    } while (e !== null);
    Qe = 6, de = null;
  }
  function Vh(e, t, n, a, r, u, f, h, y) {
    e.cancelPendingCommit = null;
    do
      Lr();
    while (lt !== 0);
    if ((Re & 6) !== 0) throw Error(c(327));
    if (t !== null) {
      if (t === e.current) throw Error(c(177));
      if (u = t.lanes | t.childLanes, u |= mu, Mg(
        e,
        n,
        u,
        f,
        h,
        y
      ), e === xe && (de = xe = null, pe = 0), ha = t, el = e, jn = n, wc = u, Ac = r, jh = a, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, I0(Bl, function() {
        return $h(), null;
      })) : (e.callbackNode = null, e.callbackPriority = 0), a = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || a) {
        a = b.T, b.T = null, r = x.p, x.p = 2, f = Re, Re |= 4;
        try {
          Q0(e, t, n);
        } finally {
          Re = f, x.p = r, b.T = a;
        }
      }
      lt = 1, Kh(), Ph(), Jh();
    }
  }
  function Kh() {
    if (lt === 1) {
      lt = 0;
      var e = el, t = ha, n = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || n) {
        n = b.T, b.T = null;
        var a = x.p;
        x.p = 2;
        var r = Re;
        Re |= 4;
        try {
          zh(t, e);
          var u = Cc, f = xo(e.containerInfo), h = u.focusedElem, y = u.selectionRange;
          if (f !== h && h && h.ownerDocument && No(
            h.ownerDocument.documentElement,
            h
          )) {
            if (y !== null && cu(h)) {
              var R = y.start, M = y.end;
              if (M === void 0 && (M = R), "selectionStart" in h)
                h.selectionStart = R, h.selectionEnd = Math.min(
                  M,
                  h.value.length
                );
              else {
                var U = h.ownerDocument || document, z = U && U.defaultView || window;
                if (z.getSelection) {
                  var D = z.getSelection(), X = h.textContent.length, k = Math.min(y.start, X), Ue = y.end === void 0 ? k : Math.min(y.end, X);
                  !D.extend && k > Ue && (f = Ue, Ue = k, k = f);
                  var E = Uo(
                    h,
                    k
                  ), v = Uo(
                    h,
                    Ue
                  );
                  if (E && v && (D.rangeCount !== 1 || D.anchorNode !== E.node || D.anchorOffset !== E.offset || D.focusNode !== v.node || D.focusOffset !== v.offset)) {
                    var O = U.createRange();
                    O.setStart(E.node, E.offset), D.removeAllRanges(), k > Ue ? (D.addRange(O), D.extend(v.node, v.offset)) : (O.setEnd(v.node, v.offset), D.addRange(O));
                  }
                }
              }
            }
            for (U = [], D = h; D = D.parentNode; )
              D.nodeType === 1 && U.push({
                element: D,
                left: D.scrollLeft,
                top: D.scrollTop
              });
            for (typeof h.focus == "function" && h.focus(), h = 0; h < U.length; h++) {
              var T = U[h];
              T.element.scrollLeft = T.left, T.element.scrollTop = T.top;
            }
          }
          Wr = !!_c, Cc = _c = null;
        } finally {
          Re = r, x.p = a, b.T = n;
        }
      }
      e.current = t, lt = 2;
    }
  }
  function Ph() {
    if (lt === 2) {
      lt = 0;
      var e = el, t = ha, n = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || n) {
        n = b.T, b.T = null;
        var a = x.p;
        x.p = 2;
        var r = Re;
        Re |= 4;
        try {
          Eh(e, t.alternate, t);
        } finally {
          Re = r, x.p = a, b.T = n;
        }
      }
      lt = 3;
    }
  }
  function Jh() {
    if (lt === 4 || lt === 3) {
      lt = 0, Hl();
      var e = el, t = ha, n = jn, a = jh;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? lt = 5 : (lt = 0, ha = el = null, Fh(e, e.pendingLanes));
      var r = e.pendingLanes;
      if (r === 0 && (In = null), Zs(n), t = t.stateNode, Nt && typeof Nt.onCommitFiberRoot == "function")
        try {
          Nt.onCommitFiberRoot(
            Ta,
            t,
            void 0,
            (t.current.flags & 128) === 128
          );
        } catch {
        }
      if (a !== null) {
        t = b.T, r = x.p, x.p = 2, b.T = null;
        try {
          for (var u = e.onRecoverableError, f = 0; f < a.length; f++) {
            var h = a[f];
            u(h.value, {
              componentStack: h.stack
            });
          }
        } finally {
          b.T = t, x.p = r;
        }
      }
      (jn & 3) !== 0 && Lr(), dn(e), r = e.pendingLanes, (n & 261930) !== 0 && (r & 42) !== 0 ? e === Oc ? fi++ : (fi = 0, Oc = e) : fi = 0, oi(0);
    }
  }
  function Fh(e, t) {
    (e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, Va(t)));
  }
  function Lr() {
    return Kh(), Ph(), Jh(), $h();
  }
  function $h() {
    if (lt !== 5) return !1;
    var e = el, t = wc;
    wc = 0;
    var n = Zs(jn), a = b.T, r = x.p;
    try {
      x.p = 32 > n ? 32 : n, b.T = null, n = Ac, Ac = null;
      var u = el, f = jn;
      if (lt = 0, ha = el = null, jn = 0, (Re & 6) !== 0) throw Error(c(331));
      var h = Re;
      if (Re |= 4, Nh(u.current), Mh(
        u,
        u.current,
        f,
        n
      ), Re = h, oi(0, !1), Nt && typeof Nt.onPostCommitFiberRoot == "function")
        try {
          Nt.onPostCommitFiberRoot(Ta, u);
        } catch {
        }
      return !0;
    } finally {
      x.p = r, b.T = a, Fh(e, t);
    }
  }
  function Wh(e, t, n) {
    t = Kt(n, t), t = nc(e.stateNode, t, 2), e = Pn(e, t, 2), e !== null && (Na(e, 2), dn(e));
  }
  function De(e, t, n) {
    if (e.tag === 3)
      Wh(e, e, n);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          Wh(
            t,
            e,
            n
          );
          break;
        } else if (t.tag === 1) {
          var a = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof a.componentDidCatch == "function" && (In === null || !In.has(a))) {
            e = Kt(n, e), n = kd(2), a = Pn(t, n, 2), a !== null && (Id(
              n,
              a,
              t,
              e
            ), Na(a, 2), dn(a));
            break;
          }
        }
        t = t.return;
      }
  }
  function Dc(e, t, n) {
    var a = e.pingCache;
    if (a === null) {
      a = e.pingCache = new V0();
      var r = /* @__PURE__ */ new Set();
      a.set(t, r);
    } else
      r = a.get(t), r === void 0 && (r = /* @__PURE__ */ new Set(), a.set(t, r));
    r.has(n) || (Sc = !0, r.add(n), e = $0.bind(null, e, t, n), t.then(e, e));
  }
  function $0(e, t, n) {
    var a = e.pingCache;
    a !== null && a.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, xe === e && (pe & n) === n && (Qe === 4 || Qe === 3 && (pe & 62914560) === pe && 300 > st() - qr ? (Re & 2) === 0 && ma(e, 0) : bc |= n, da === pe && (da = 0)), dn(e);
  }
  function kh(e, t) {
    t === 0 && (t = Vf()), e = bl(e, t), e !== null && (Na(e, t), dn(e));
  }
  function W0(e) {
    var t = e.memoizedState, n = 0;
    t !== null && (n = t.retryLane), kh(e, n);
  }
  function k0(e, t) {
    var n = 0;
    switch (e.tag) {
      case 31:
      case 13:
        var a = e.stateNode, r = e.memoizedState;
        r !== null && (n = r.retryLane);
        break;
      case 19:
        a = e.stateNode;
        break;
      case 22:
        a = e.stateNode._retryCache;
        break;
      default:
        throw Error(c(314));
    }
    a !== null && a.delete(t), kh(e, n);
  }
  function I0(e, t) {
    return we(e, t);
  }
  var Xr = null, ya = null, Mc = !1, Yr = !1, Tc = !1, nl = 0;
  function dn(e) {
    e !== ya && e.next === null && (ya === null ? Xr = ya = e : ya = ya.next = e), Yr = !0, Mc || (Mc = !0, tv());
  }
  function oi(e, t) {
    if (!Tc && Yr) {
      Tc = !0;
      do
        for (var n = !1, a = Xr; a !== null; ) {
          if (e !== 0) {
            var r = a.pendingLanes;
            if (r === 0) var u = 0;
            else {
              var f = a.suspendedLanes, h = a.pingedLanes;
              u = (1 << 31 - xt(42 | e) + 1) - 1, u &= r & ~(f & ~h), u = u & 201326741 ? u & 201326741 | 1 : u ? u | 2 : 0;
            }
            u !== 0 && (n = !0, nm(a, u));
          } else
            u = pe, u = Vi(
              a,
              a === xe ? u : 0,
              a.cancelPendingCommit !== null || a.timeoutHandle !== -1
            ), (u & 3) === 0 || Ua(a, u) || (n = !0, nm(a, u));
          a = a.next;
        }
      while (n);
      Tc = !1;
    }
  }
  function ev() {
    Ih();
  }
  function Ih() {
    Yr = Mc = !1;
    var e = 0;
    nl !== 0 && ov() && (e = nl);
    for (var t = st(), n = null, a = Xr; a !== null; ) {
      var r = a.next, u = em(a, t);
      u === 0 ? (a.next = null, n === null ? Xr = r : n.next = r, r === null && (ya = n)) : (n = a, (e !== 0 || (u & 3) !== 0) && (Yr = !0)), a = r;
    }
    lt !== 0 && lt !== 5 || oi(e), nl !== 0 && (nl = 0);
  }
  function em(e, t) {
    for (var n = e.suspendedLanes, a = e.pingedLanes, r = e.expirationTimes, u = e.pendingLanes & -62914561; 0 < u; ) {
      var f = 31 - xt(u), h = 1 << f, y = r[f];
      y === -1 ? ((h & n) === 0 || (h & a) !== 0) && (r[f] = Dg(h, t)) : y <= t && (e.expiredLanes |= h), u &= ~h;
    }
    if (t = xe, n = pe, n = Vi(
      e,
      e === t ? n : 0,
      e.cancelPendingCommit !== null || e.timeoutHandle !== -1
    ), a = e.callbackNode, n === 0 || e === t && (ze === 2 || ze === 9) || e.cancelPendingCommit !== null)
      return a !== null && a !== null && nt(a), e.callbackNode = null, e.callbackPriority = 0;
    if ((n & 3) === 0 || Ua(e, n)) {
      if (t = n & -n, t === e.callbackPriority) return t;
      switch (a !== null && nt(a), Zs(n)) {
        case 2:
        case 8:
          n = gn;
          break;
        case 32:
          n = Bl;
          break;
        case 268435456:
          n = Zf;
          break;
        default:
          n = Bl;
      }
      return a = tm.bind(null, e), n = we(n, a), e.callbackPriority = t, e.callbackNode = n, t;
    }
    return a !== null && a !== null && nt(a), e.callbackPriority = 2, e.callbackNode = null, 2;
  }
  function tm(e, t) {
    if (lt !== 0 && lt !== 5)
      return e.callbackNode = null, e.callbackPriority = 0, null;
    var n = e.callbackNode;
    if (Lr() && e.callbackNode !== n)
      return null;
    var a = pe;
    return a = Vi(
      e,
      e === xe ? a : 0,
      e.cancelPendingCommit !== null || e.timeoutHandle !== -1
    ), a === 0 ? null : (Bh(e, a, t), em(e, st()), e.callbackNode != null && e.callbackNode === n ? tm.bind(null, e) : null);
  }
  function nm(e, t) {
    if (Lr()) return null;
    Bh(e, t, !0);
  }
  function tv() {
    hv(function() {
      (Re & 6) !== 0 ? we(
        Fe,
        ev
      ) : Ih();
    });
  }
  function Uc() {
    if (nl === 0) {
      var e = ta;
      e === 0 && (e = Qi, Qi <<= 1, (Qi & 261888) === 0 && (Qi = 256)), nl = e;
    }
    return nl;
  }
  function lm(e) {
    return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : Fi("" + e);
  }
  function am(e, t) {
    var n = t.ownerDocument.createElement("input");
    return n.name = t.name, n.value = t.value, e.id && n.setAttribute("form", e.id), t.parentNode.insertBefore(n, t), e = new FormData(e), n.parentNode.removeChild(n), e;
  }
  function nv(e, t, n, a, r) {
    if (t === "submit" && n && n.stateNode === r) {
      var u = lm(
        (r[bt] || null).action
      ), f = a.submitter;
      f && (t = (t = f[bt] || null) ? lm(t.formAction) : f.getAttribute("formAction"), t !== null && (u = t, f = null));
      var h = new Ii(
        "action",
        "action",
        null,
        a,
        r
      );
      e.push({
        event: h,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (a.defaultPrevented) {
                if (nl !== 0) {
                  var y = f ? am(r, f) : new FormData(r);
                  $u(
                    n,
                    {
                      pending: !0,
                      data: y,
                      method: r.method,
                      action: u
                    },
                    null,
                    y
                  );
                }
              } else
                typeof u == "function" && (h.preventDefault(), y = f ? am(r, f) : new FormData(r), $u(
                  n,
                  {
                    pending: !0,
                    data: y,
                    method: r.method,
                    action: u
                  },
                  u,
                  y
                ));
            },
            currentTarget: r
          }
        ]
      });
    }
  }
  for (var Nc = 0; Nc < hu.length; Nc++) {
    var xc = hu[Nc], lv = xc.toLowerCase(), av = xc[0].toUpperCase() + xc.slice(1);
    nn(
      lv,
      "on" + av
    );
  }
  nn(Ho, "onAnimationEnd"), nn(Bo, "onAnimationIteration"), nn(_o, "onAnimationStart"), nn("dblclick", "onDoubleClick"), nn("focusin", "onFocus"), nn("focusout", "onBlur"), nn(b0, "onTransitionRun"), nn(E0, "onTransitionStart"), nn(w0, "onTransitionCancel"), nn(Co, "onTransitionEnd"), Yl("onMouseEnter", ["mouseout", "mouseover"]), Yl("onMouseLeave", ["mouseout", "mouseover"]), Yl("onPointerEnter", ["pointerout", "pointerover"]), Yl("onPointerLeave", ["pointerout", "pointerover"]), yl(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), yl(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), yl("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), yl(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), yl(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), yl(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var di = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), iv = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(di)
  );
  function im(e, t) {
    t = (t & 4) !== 0;
    for (var n = 0; n < e.length; n++) {
      var a = e[n], r = a.event;
      a = a.listeners;
      e: {
        var u = void 0;
        if (t)
          for (var f = a.length - 1; 0 <= f; f--) {
            var h = a[f], y = h.instance, R = h.currentTarget;
            if (h = h.listener, y !== u && r.isPropagationStopped())
              break e;
            u = h, r.currentTarget = R;
            try {
              u(r);
            } catch (M) {
              nr(M);
            }
            r.currentTarget = null, u = y;
          }
        else
          for (f = 0; f < a.length; f++) {
            if (h = a[f], y = h.instance, R = h.currentTarget, h = h.listener, y !== u && r.isPropagationStopped())
              break e;
            u = h, r.currentTarget = R;
            try {
              u(r);
            } catch (M) {
              nr(M);
            }
            r.currentTarget = null, u = y;
          }
      }
    }
  }
  function he(e, t) {
    var n = t[Vs];
    n === void 0 && (n = t[Vs] = /* @__PURE__ */ new Set());
    var a = e + "__bubble";
    n.has(a) || (rm(t, e, 2, !1), n.add(a));
  }
  function qc(e, t, n) {
    var a = 0;
    t && (a |= 4), rm(
      n,
      e,
      a,
      t
    );
  }
  var Qr = "_reactListening" + Math.random().toString(36).slice(2);
  function jc(e) {
    if (!e[Qr]) {
      e[Qr] = !0, kf.forEach(function(n) {
        n !== "selectionchange" && (iv.has(n) || qc(n, !1, e), qc(n, !0, e));
      });
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[Qr] || (t[Qr] = !0, qc("selectionchange", !1, t));
    }
  }
  function rm(e, t, n, a) {
    switch (Hm(t)) {
      case 2:
        var r = qv;
        break;
      case 8:
        r = jv;
        break;
      default:
        r = Fc;
    }
    n = r.bind(
      null,
      t,
      n,
      e
    ), r = void 0, !eu || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (r = !0), a ? r !== void 0 ? e.addEventListener(t, n, {
      capture: !0,
      passive: r
    }) : e.addEventListener(t, n, !0) : r !== void 0 ? e.addEventListener(t, n, {
      passive: r
    }) : e.addEventListener(t, n, !1);
  }
  function Hc(e, t, n, a, r) {
    var u = a;
    if ((t & 1) === 0 && (t & 2) === 0 && a !== null)
      e: for (; ; ) {
        if (a === null) return;
        var f = a.tag;
        if (f === 3 || f === 4) {
          var h = a.stateNode.containerInfo;
          if (h === r) break;
          if (f === 4)
            for (f = a.return; f !== null; ) {
              var y = f.tag;
              if ((y === 3 || y === 4) && f.stateNode.containerInfo === r)
                return;
              f = f.return;
            }
          for (; h !== null; ) {
            if (f = Cl(h), f === null) return;
            if (y = f.tag, y === 5 || y === 6 || y === 26 || y === 27) {
              a = u = f;
              continue e;
            }
            h = h.parentNode;
          }
        }
        a = a.return;
      }
    fo(function() {
      var R = u, M = ks(n), U = [];
      e: {
        var z = Lo.get(e);
        if (z !== void 0) {
          var D = Ii, X = e;
          switch (e) {
            case "keypress":
              if (Wi(n) === 0) break e;
            case "keydown":
            case "keyup":
              D = kg;
              break;
            case "focusin":
              X = "focus", D = au;
              break;
            case "focusout":
              X = "blur", D = au;
              break;
            case "beforeblur":
            case "afterblur":
              D = au;
              break;
            case "click":
              if (n.button === 2) break e;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              D = mo;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              D = Xg;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              D = t0;
              break;
            case Ho:
            case Bo:
            case _o:
              D = Gg;
              break;
            case Co:
              D = l0;
              break;
            case "scroll":
            case "scrollend":
              D = Cg;
              break;
            case "wheel":
              D = i0;
              break;
            case "copy":
            case "cut":
            case "paste":
              D = Vg;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              D = yo;
              break;
            case "toggle":
            case "beforetoggle":
              D = s0;
          }
          var k = (t & 4) !== 0, Ue = !k && (e === "scroll" || e === "scrollend"), E = k ? z !== null ? z + "Capture" : null : z;
          k = [];
          for (var v = R, O; v !== null; ) {
            var T = v;
            if (O = T.stateNode, T = T.tag, T !== 5 && T !== 26 && T !== 27 || O === null || E === null || (T = ja(v, E), T != null && k.push(
              hi(v, T, O)
            )), Ue) break;
            v = v.return;
          }
          0 < k.length && (z = new D(
            z,
            X,
            null,
            n,
            M
          ), U.push({ event: z, listeners: k }));
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (z = e === "mouseover" || e === "pointerover", D = e === "mouseout" || e === "pointerout", z && n !== Ws && (X = n.relatedTarget || n.fromElement) && (Cl(X) || X[_l]))
            break e;
          if ((D || z) && (z = M.window === M ? M : (z = M.ownerDocument) ? z.defaultView || z.parentWindow : window, D ? (X = n.relatedTarget || n.toElement, D = R, X = X ? Cl(X) : null, X !== null && (Ue = p(X), k = X.tag, X !== Ue || k !== 5 && k !== 27 && k !== 6) && (X = null)) : (D = null, X = R), D !== X)) {
            if (k = mo, T = "onMouseLeave", E = "onMouseEnter", v = "mouse", (e === "pointerout" || e === "pointerover") && (k = yo, T = "onPointerLeave", E = "onPointerEnter", v = "pointer"), Ue = D == null ? z : qa(D), O = X == null ? z : qa(X), z = new k(
              T,
              v + "leave",
              D,
              n,
              M
            ), z.target = Ue, z.relatedTarget = O, T = null, Cl(M) === R && (k = new k(
              E,
              v + "enter",
              X,
              n,
              M
            ), k.target = O, k.relatedTarget = Ue, T = k), Ue = T, D && X)
              t: {
                for (k = rv, E = D, v = X, O = 0, T = E; T; T = k(T))
                  O++;
                T = 0;
                for (var F = v; F; F = k(F))
                  T++;
                for (; 0 < O - T; )
                  E = k(E), O--;
                for (; 0 < T - O; )
                  v = k(v), T--;
                for (; O--; ) {
                  if (E === v || v !== null && E === v.alternate) {
                    k = E;
                    break t;
                  }
                  E = k(E), v = k(v);
                }
                k = null;
              }
            else k = null;
            D !== null && sm(
              U,
              z,
              D,
              k,
              !1
            ), X !== null && Ue !== null && sm(
              U,
              Ue,
              X,
              k,
              !0
            );
          }
        }
        e: {
          if (z = R ? qa(R) : window, D = z.nodeName && z.nodeName.toLowerCase(), D === "select" || D === "input" && z.type === "file")
            var Ae = Oo;
          else if (wo(z))
            if (Ro)
              Ae = g0;
            else {
              Ae = p0;
              var G = m0;
            }
          else
            D = z.nodeName, !D || D.toLowerCase() !== "input" || z.type !== "checkbox" && z.type !== "radio" ? R && $s(R.elementType) && (Ae = Oo) : Ae = y0;
          if (Ae && (Ae = Ae(e, R))) {
            Ao(
              U,
              Ae,
              n,
              M
            );
            break e;
          }
          G && G(e, z, R), e === "focusout" && R && z.type === "number" && R.memoizedProps.value != null && Fs(z, "number", z.value);
        }
        switch (G = R ? qa(R) : window, e) {
          case "focusin":
            (wo(G) || G.contentEditable === "true") && (Pl = G, fu = R, Qa = null);
            break;
          case "focusout":
            Qa = fu = Pl = null;
            break;
          case "mousedown":
            ou = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            ou = !1, qo(U, n, M);
            break;
          case "selectionchange":
            if (S0) break;
          case "keydown":
          case "keyup":
            qo(U, n, M);
        }
        var se;
        if (ru)
          e: {
            switch (e) {
              case "compositionstart":
                var ye = "onCompositionStart";
                break e;
              case "compositionend":
                ye = "onCompositionEnd";
                break e;
              case "compositionupdate":
                ye = "onCompositionUpdate";
                break e;
            }
            ye = void 0;
          }
        else
          Kl ? bo(e, n) && (ye = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (ye = "onCompositionStart");
        ye && (go && n.locale !== "ko" && (Kl || ye !== "onCompositionStart" ? ye === "onCompositionEnd" && Kl && (se = oo()) : (Xn = M, tu = "value" in Xn ? Xn.value : Xn.textContent, Kl = !0)), G = Gr(R, ye), 0 < G.length && (ye = new po(
          ye,
          e,
          null,
          n,
          M
        ), U.push({ event: ye, listeners: G }), se ? ye.data = se : (se = Eo(n), se !== null && (ye.data = se)))), (se = c0 ? f0(e, n) : o0(e, n)) && (ye = Gr(R, "onBeforeInput"), 0 < ye.length && (G = new po(
          "onBeforeInput",
          "beforeinput",
          null,
          n,
          M
        ), U.push({
          event: G,
          listeners: ye
        }), G.data = se)), nv(
          U,
          e,
          R,
          n,
          M
        );
      }
      im(U, t);
    });
  }
  function hi(e, t, n) {
    return {
      instance: e,
      listener: t,
      currentTarget: n
    };
  }
  function Gr(e, t) {
    for (var n = t + "Capture", a = []; e !== null; ) {
      var r = e, u = r.stateNode;
      if (r = r.tag, r !== 5 && r !== 26 && r !== 27 || u === null || (r = ja(e, n), r != null && a.unshift(
        hi(e, r, u)
      ), r = ja(e, t), r != null && a.push(
        hi(e, r, u)
      )), e.tag === 3) return a;
      e = e.return;
    }
    return [];
  }
  function rv(e) {
    if (e === null) return null;
    do
      e = e.return;
    while (e && e.tag !== 5 && e.tag !== 27);
    return e || null;
  }
  function sm(e, t, n, a, r) {
    for (var u = t._reactName, f = []; n !== null && n !== a; ) {
      var h = n, y = h.alternate, R = h.stateNode;
      if (h = h.tag, y !== null && y === a) break;
      h !== 5 && h !== 26 && h !== 27 || R === null || (y = R, r ? (R = ja(n, u), R != null && f.unshift(
        hi(n, R, y)
      )) : r || (R = ja(n, u), R != null && f.push(
        hi(n, R, y)
      ))), n = n.return;
    }
    f.length !== 0 && e.push({ event: t, listeners: f });
  }
  var sv = /\r\n?/g, uv = /\u0000|\uFFFD/g;
  function um(e) {
    return (typeof e == "string" ? e : "" + e).replace(sv, `
`).replace(uv, "");
  }
  function cm(e, t) {
    return t = um(t), um(e) === t;
  }
  function Te(e, t, n, a, r, u) {
    switch (n) {
      case "children":
        typeof a == "string" ? t === "body" || t === "textarea" && a === "" || Gl(e, a) : (typeof a == "number" || typeof a == "bigint") && t !== "body" && Gl(e, "" + a);
        break;
      case "className":
        Pi(e, "class", a);
        break;
      case "tabIndex":
        Pi(e, "tabindex", a);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Pi(e, n, a);
        break;
      case "style":
        uo(e, a, u);
        break;
      case "data":
        if (t !== "object") {
          Pi(e, "data", a);
          break;
        }
      case "src":
      case "href":
        if (a === "" && (t !== "a" || n !== "href")) {
          e.removeAttribute(n);
          break;
        }
        if (a == null || typeof a == "function" || typeof a == "symbol" || typeof a == "boolean") {
          e.removeAttribute(n);
          break;
        }
        a = Fi("" + a), e.setAttribute(n, a);
        break;
      case "action":
      case "formAction":
        if (typeof a == "function") {
          e.setAttribute(
            n,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof u == "function" && (n === "formAction" ? (t !== "input" && Te(e, t, "name", r.name, r, null), Te(
            e,
            t,
            "formEncType",
            r.formEncType,
            r,
            null
          ), Te(
            e,
            t,
            "formMethod",
            r.formMethod,
            r,
            null
          ), Te(
            e,
            t,
            "formTarget",
            r.formTarget,
            r,
            null
          )) : (Te(e, t, "encType", r.encType, r, null), Te(e, t, "method", r.method, r, null), Te(e, t, "target", r.target, r, null)));
        if (a == null || typeof a == "symbol" || typeof a == "boolean") {
          e.removeAttribute(n);
          break;
        }
        a = Fi("" + a), e.setAttribute(n, a);
        break;
      case "onClick":
        a != null && (e.onclick = Sn);
        break;
      case "onScroll":
        a != null && he("scroll", e);
        break;
      case "onScrollEnd":
        a != null && he("scrollend", e);
        break;
      case "dangerouslySetInnerHTML":
        if (a != null) {
          if (typeof a != "object" || !("__html" in a))
            throw Error(c(61));
          if (n = a.__html, n != null) {
            if (r.children != null) throw Error(c(60));
            e.innerHTML = n;
          }
        }
        break;
      case "multiple":
        e.multiple = a && typeof a != "function" && typeof a != "symbol";
        break;
      case "muted":
        e.muted = a && typeof a != "function" && typeof a != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (a == null || typeof a == "function" || typeof a == "boolean" || typeof a == "symbol") {
          e.removeAttribute("xlink:href");
          break;
        }
        n = Fi("" + a), e.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          n
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        a != null && typeof a != "function" && typeof a != "symbol" ? e.setAttribute(n, "" + a) : e.removeAttribute(n);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        a && typeof a != "function" && typeof a != "symbol" ? e.setAttribute(n, "") : e.removeAttribute(n);
        break;
      case "capture":
      case "download":
        a === !0 ? e.setAttribute(n, "") : a !== !1 && a != null && typeof a != "function" && typeof a != "symbol" ? e.setAttribute(n, a) : e.removeAttribute(n);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        a != null && typeof a != "function" && typeof a != "symbol" && !isNaN(a) && 1 <= a ? e.setAttribute(n, a) : e.removeAttribute(n);
        break;
      case "rowSpan":
      case "start":
        a == null || typeof a == "function" || typeof a == "symbol" || isNaN(a) ? e.removeAttribute(n) : e.setAttribute(n, a);
        break;
      case "popover":
        he("beforetoggle", e), he("toggle", e), Ki(e, "popover", a);
        break;
      case "xlinkActuate":
        vn(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          a
        );
        break;
      case "xlinkArcrole":
        vn(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          a
        );
        break;
      case "xlinkRole":
        vn(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          a
        );
        break;
      case "xlinkShow":
        vn(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          a
        );
        break;
      case "xlinkTitle":
        vn(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          a
        );
        break;
      case "xlinkType":
        vn(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          a
        );
        break;
      case "xmlBase":
        vn(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          a
        );
        break;
      case "xmlLang":
        vn(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          a
        );
        break;
      case "xmlSpace":
        vn(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          a
        );
        break;
      case "is":
        Ki(e, "is", a);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") && (n = Bg.get(n) || n, Ki(e, n, a));
    }
  }
  function Bc(e, t, n, a, r, u) {
    switch (n) {
      case "style":
        uo(e, a, u);
        break;
      case "dangerouslySetInnerHTML":
        if (a != null) {
          if (typeof a != "object" || !("__html" in a))
            throw Error(c(61));
          if (n = a.__html, n != null) {
            if (r.children != null) throw Error(c(60));
            e.innerHTML = n;
          }
        }
        break;
      case "children":
        typeof a == "string" ? Gl(e, a) : (typeof a == "number" || typeof a == "bigint") && Gl(e, "" + a);
        break;
      case "onScroll":
        a != null && he("scroll", e);
        break;
      case "onScrollEnd":
        a != null && he("scrollend", e);
        break;
      case "onClick":
        a != null && (e.onclick = Sn);
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!If.hasOwnProperty(n))
          e: {
            if (n[0] === "o" && n[1] === "n" && (r = n.endsWith("Capture"), t = n.slice(2, r ? n.length - 7 : void 0), u = e[bt] || null, u = u != null ? u[n] : null, typeof u == "function" && e.removeEventListener(t, u, r), typeof a == "function")) {
              typeof u != "function" && u !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(t, a, r);
              break e;
            }
            n in e ? e[n] = a : a === !0 ? e.setAttribute(n, "") : Ki(e, n, a);
          }
    }
  }
  function dt(e, t, n) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        he("error", e), he("load", e);
        var a = !1, r = !1, u;
        for (u in n)
          if (n.hasOwnProperty(u)) {
            var f = n[u];
            if (f != null)
              switch (u) {
                case "src":
                  a = !0;
                  break;
                case "srcSet":
                  r = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(c(137, t));
                default:
                  Te(e, t, u, f, n, null);
              }
          }
        r && Te(e, t, "srcSet", n.srcSet, n, null), a && Te(e, t, "src", n.src, n, null);
        return;
      case "input":
        he("invalid", e);
        var h = u = f = r = null, y = null, R = null;
        for (a in n)
          if (n.hasOwnProperty(a)) {
            var M = n[a];
            if (M != null)
              switch (a) {
                case "name":
                  r = M;
                  break;
                case "type":
                  f = M;
                  break;
                case "checked":
                  y = M;
                  break;
                case "defaultChecked":
                  R = M;
                  break;
                case "value":
                  u = M;
                  break;
                case "defaultValue":
                  h = M;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (M != null)
                    throw Error(c(137, t));
                  break;
                default:
                  Te(e, t, a, M, n, null);
              }
          }
        ao(
          e,
          u,
          h,
          y,
          R,
          f,
          r,
          !1
        );
        return;
      case "select":
        he("invalid", e), a = f = u = null;
        for (r in n)
          if (n.hasOwnProperty(r) && (h = n[r], h != null))
            switch (r) {
              case "value":
                u = h;
                break;
              case "defaultValue":
                f = h;
                break;
              case "multiple":
                a = h;
              default:
                Te(e, t, r, h, n, null);
            }
        t = u, n = f, e.multiple = !!a, t != null ? Ql(e, !!a, t, !1) : n != null && Ql(e, !!a, n, !0);
        return;
      case "textarea":
        he("invalid", e), u = r = a = null;
        for (f in n)
          if (n.hasOwnProperty(f) && (h = n[f], h != null))
            switch (f) {
              case "value":
                a = h;
                break;
              case "defaultValue":
                r = h;
                break;
              case "children":
                u = h;
                break;
              case "dangerouslySetInnerHTML":
                if (h != null) throw Error(c(91));
                break;
              default:
                Te(e, t, f, h, n, null);
            }
        ro(e, a, r, u);
        return;
      case "option":
        for (y in n)
          n.hasOwnProperty(y) && (a = n[y], a != null) && (y === "selected" ? e.selected = a && typeof a != "function" && typeof a != "symbol" : Te(e, t, y, a, n, null));
        return;
      case "dialog":
        he("beforetoggle", e), he("toggle", e), he("cancel", e), he("close", e);
        break;
      case "iframe":
      case "object":
        he("load", e);
        break;
      case "video":
      case "audio":
        for (a = 0; a < di.length; a++)
          he(di[a], e);
        break;
      case "image":
        he("error", e), he("load", e);
        break;
      case "details":
        he("toggle", e);
        break;
      case "embed":
      case "source":
      case "link":
        he("error", e), he("load", e);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (R in n)
          if (n.hasOwnProperty(R) && (a = n[R], a != null))
            switch (R) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(c(137, t));
              default:
                Te(e, t, R, a, n, null);
            }
        return;
      default:
        if ($s(t)) {
          for (M in n)
            n.hasOwnProperty(M) && (a = n[M], a !== void 0 && Bc(
              e,
              t,
              M,
              a,
              n,
              void 0
            ));
          return;
        }
    }
    for (h in n)
      n.hasOwnProperty(h) && (a = n[h], a != null && Te(e, t, h, a, n, null));
  }
  function cv(e, t, n, a) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var r = null, u = null, f = null, h = null, y = null, R = null, M = null;
        for (D in n) {
          var U = n[D];
          if (n.hasOwnProperty(D) && U != null)
            switch (D) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                y = U;
              default:
                a.hasOwnProperty(D) || Te(e, t, D, null, a, U);
            }
        }
        for (var z in a) {
          var D = a[z];
          if (U = n[z], a.hasOwnProperty(z) && (D != null || U != null))
            switch (z) {
              case "type":
                u = D;
                break;
              case "name":
                r = D;
                break;
              case "checked":
                R = D;
                break;
              case "defaultChecked":
                M = D;
                break;
              case "value":
                f = D;
                break;
              case "defaultValue":
                h = D;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (D != null)
                  throw Error(c(137, t));
                break;
              default:
                D !== U && Te(
                  e,
                  t,
                  z,
                  D,
                  a,
                  U
                );
            }
        }
        Js(
          e,
          f,
          h,
          y,
          R,
          M,
          u,
          r
        );
        return;
      case "select":
        D = f = h = z = null;
        for (u in n)
          if (y = n[u], n.hasOwnProperty(u) && y != null)
            switch (u) {
              case "value":
                break;
              case "multiple":
                D = y;
              default:
                a.hasOwnProperty(u) || Te(
                  e,
                  t,
                  u,
                  null,
                  a,
                  y
                );
            }
        for (r in a)
          if (u = a[r], y = n[r], a.hasOwnProperty(r) && (u != null || y != null))
            switch (r) {
              case "value":
                z = u;
                break;
              case "defaultValue":
                h = u;
                break;
              case "multiple":
                f = u;
              default:
                u !== y && Te(
                  e,
                  t,
                  r,
                  u,
                  a,
                  y
                );
            }
        t = h, n = f, a = D, z != null ? Ql(e, !!n, z, !1) : !!a != !!n && (t != null ? Ql(e, !!n, t, !0) : Ql(e, !!n, n ? [] : "", !1));
        return;
      case "textarea":
        D = z = null;
        for (h in n)
          if (r = n[h], n.hasOwnProperty(h) && r != null && !a.hasOwnProperty(h))
            switch (h) {
              case "value":
                break;
              case "children":
                break;
              default:
                Te(e, t, h, null, a, r);
            }
        for (f in a)
          if (r = a[f], u = n[f], a.hasOwnProperty(f) && (r != null || u != null))
            switch (f) {
              case "value":
                z = r;
                break;
              case "defaultValue":
                D = r;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (r != null) throw Error(c(91));
                break;
              default:
                r !== u && Te(e, t, f, r, a, u);
            }
        io(e, z, D);
        return;
      case "option":
        for (var X in n)
          z = n[X], n.hasOwnProperty(X) && z != null && !a.hasOwnProperty(X) && (X === "selected" ? e.selected = !1 : Te(
            e,
            t,
            X,
            null,
            a,
            z
          ));
        for (y in a)
          z = a[y], D = n[y], a.hasOwnProperty(y) && z !== D && (z != null || D != null) && (y === "selected" ? e.selected = z && typeof z != "function" && typeof z != "symbol" : Te(
            e,
            t,
            y,
            z,
            a,
            D
          ));
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var k in n)
          z = n[k], n.hasOwnProperty(k) && z != null && !a.hasOwnProperty(k) && Te(e, t, k, null, a, z);
        for (R in a)
          if (z = a[R], D = n[R], a.hasOwnProperty(R) && z !== D && (z != null || D != null))
            switch (R) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (z != null)
                  throw Error(c(137, t));
                break;
              default:
                Te(
                  e,
                  t,
                  R,
                  z,
                  a,
                  D
                );
            }
        return;
      default:
        if ($s(t)) {
          for (var Ue in n)
            z = n[Ue], n.hasOwnProperty(Ue) && z !== void 0 && !a.hasOwnProperty(Ue) && Bc(
              e,
              t,
              Ue,
              void 0,
              a,
              z
            );
          for (M in a)
            z = a[M], D = n[M], !a.hasOwnProperty(M) || z === D || z === void 0 && D === void 0 || Bc(
              e,
              t,
              M,
              z,
              a,
              D
            );
          return;
        }
    }
    for (var E in n)
      z = n[E], n.hasOwnProperty(E) && z != null && !a.hasOwnProperty(E) && Te(e, t, E, null, a, z);
    for (U in a)
      z = a[U], D = n[U], !a.hasOwnProperty(U) || z === D || z == null && D == null || Te(e, t, U, z, a, D);
  }
  function fm(e) {
    switch (e) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function fv() {
    if (typeof performance.getEntriesByType == "function") {
      for (var e = 0, t = 0, n = performance.getEntriesByType("resource"), a = 0; a < n.length; a++) {
        var r = n[a], u = r.transferSize, f = r.initiatorType, h = r.duration;
        if (u && h && fm(f)) {
          for (f = 0, h = r.responseEnd, a += 1; a < n.length; a++) {
            var y = n[a], R = y.startTime;
            if (R > h) break;
            var M = y.transferSize, U = y.initiatorType;
            M && fm(U) && (y = y.responseEnd, f += M * (y < h ? 1 : (h - R) / (y - R)));
          }
          if (--a, t += 8 * (u + f) / (r.duration / 1e3), e++, 10 < e) break;
        }
      }
      if (0 < e) return t / e / 1e6;
    }
    return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
  }
  var _c = null, Cc = null;
  function Zr(e) {
    return e.nodeType === 9 ? e : e.ownerDocument;
  }
  function om(e) {
    switch (e) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function dm(e, t) {
    if (e === 0)
      switch (t) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return e === 1 && t === "foreignObject" ? 0 : e;
  }
  function Lc(e, t) {
    return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var Xc = null;
  function ov() {
    var e = window.event;
    return e && e.type === "popstate" ? e === Xc ? !1 : (Xc = e, !0) : (Xc = null, !1);
  }
  var hm = typeof setTimeout == "function" ? setTimeout : void 0, dv = typeof clearTimeout == "function" ? clearTimeout : void 0, mm = typeof Promise == "function" ? Promise : void 0, hv = typeof queueMicrotask == "function" ? queueMicrotask : typeof mm < "u" ? function(e) {
    return mm.resolve(null).then(e).catch(mv);
  } : hm;
  function mv(e) {
    setTimeout(function() {
      throw e;
    });
  }
  function ll(e) {
    return e === "head";
  }
  function pm(e, t) {
    var n = t, a = 0;
    do {
      var r = n.nextSibling;
      if (e.removeChild(n), r && r.nodeType === 8)
        if (n = r.data, n === "/$" || n === "/&") {
          if (a === 0) {
            e.removeChild(r), ba(t);
            return;
          }
          a--;
        } else if (n === "$" || n === "$?" || n === "$~" || n === "$!" || n === "&")
          a++;
        else if (n === "html")
          mi(e.ownerDocument.documentElement);
        else if (n === "head") {
          n = e.ownerDocument.head, mi(n);
          for (var u = n.firstChild; u; ) {
            var f = u.nextSibling, h = u.nodeName;
            u[xa] || h === "SCRIPT" || h === "STYLE" || h === "LINK" && u.rel.toLowerCase() === "stylesheet" || n.removeChild(u), u = f;
          }
        } else
          n === "body" && mi(e.ownerDocument.body);
      n = r;
    } while (n);
    ba(t);
  }
  function ym(e, t) {
    var n = e;
    e = 0;
    do {
      var a = n.nextSibling;
      if (n.nodeType === 1 ? t ? (n._stashedDisplay = n.style.display, n.style.display = "none") : (n.style.display = n._stashedDisplay || "", n.getAttribute("style") === "" && n.removeAttribute("style")) : n.nodeType === 3 && (t ? (n._stashedText = n.nodeValue, n.nodeValue = "") : n.nodeValue = n._stashedText || ""), a && a.nodeType === 8)
        if (n = a.data, n === "/$") {
          if (e === 0) break;
          e--;
        } else
          n !== "$" && n !== "$?" && n !== "$~" && n !== "$!" || e++;
      n = a;
    } while (n);
  }
  function Yc(e) {
    var t = e.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var n = t;
      switch (t = t.nextSibling, n.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          Yc(n), Ks(n);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (n.rel.toLowerCase() === "stylesheet") continue;
      }
      e.removeChild(n);
    }
  }
  function pv(e, t, n, a) {
    for (; e.nodeType === 1; ) {
      var r = n;
      if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!a && (e.nodeName !== "INPUT" || e.type !== "hidden"))
          break;
      } else if (a) {
        if (!e[xa])
          switch (t) {
            case "meta":
              if (!e.hasAttribute("itemprop")) break;
              return e;
            case "link":
              if (u = e.getAttribute("rel"), u === "stylesheet" && e.hasAttribute("data-precedence"))
                break;
              if (u !== r.rel || e.getAttribute("href") !== (r.href == null || r.href === "" ? null : r.href) || e.getAttribute("crossorigin") !== (r.crossOrigin == null ? null : r.crossOrigin) || e.getAttribute("title") !== (r.title == null ? null : r.title))
                break;
              return e;
            case "style":
              if (e.hasAttribute("data-precedence")) break;
              return e;
            case "script":
              if (u = e.getAttribute("src"), (u !== (r.src == null ? null : r.src) || e.getAttribute("type") !== (r.type == null ? null : r.type) || e.getAttribute("crossorigin") !== (r.crossOrigin == null ? null : r.crossOrigin)) && u && e.hasAttribute("async") && !e.hasAttribute("itemprop"))
                break;
              return e;
            default:
              return e;
          }
      } else if (t === "input" && e.type === "hidden") {
        var u = r.name == null ? null : "" + r.name;
        if (r.type === "hidden" && e.getAttribute("name") === u)
          return e;
      } else return e;
      if (e = Wt(e.nextSibling), e === null) break;
    }
    return null;
  }
  function yv(e, t, n) {
    if (t === "") return null;
    for (; e.nodeType !== 3; )
      if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = Wt(e.nextSibling), e === null)) return null;
    return e;
  }
  function gm(e, t) {
    for (; e.nodeType !== 8; )
      if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !t || (e = Wt(e.nextSibling), e === null)) return null;
    return e;
  }
  function Qc(e) {
    return e.data === "$?" || e.data === "$~";
  }
  function Gc(e) {
    return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
  }
  function gv(e, t) {
    var n = e.ownerDocument;
    if (e.data === "$~") e._reactRetry = t;
    else if (e.data !== "$?" || n.readyState !== "loading")
      t();
    else {
      var a = function() {
        t(), n.removeEventListener("DOMContentLoaded", a);
      };
      n.addEventListener("DOMContentLoaded", a), e._reactRetry = a;
    }
  }
  function Wt(e) {
    for (; e != null; e = e.nextSibling) {
      var t = e.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F")
          break;
        if (t === "/$" || t === "/&") return null;
      }
    }
    return e;
  }
  var Zc = null;
  function vm(e) {
    e = e.nextSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var n = e.data;
        if (n === "/$" || n === "/&") {
          if (t === 0)
            return Wt(e.nextSibling);
          t--;
        } else
          n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&" || t++;
      }
      e = e.nextSibling;
    }
    return null;
  }
  function Sm(e) {
    e = e.previousSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var n = e.data;
        if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
          if (t === 0) return e;
          t--;
        } else n !== "/$" && n !== "/&" || t++;
      }
      e = e.previousSibling;
    }
    return null;
  }
  function bm(e, t, n) {
    switch (t = Zr(n), e) {
      case "html":
        if (e = t.documentElement, !e) throw Error(c(452));
        return e;
      case "head":
        if (e = t.head, !e) throw Error(c(453));
        return e;
      case "body":
        if (e = t.body, !e) throw Error(c(454));
        return e;
      default:
        throw Error(c(451));
    }
  }
  function mi(e) {
    for (var t = e.attributes; t.length; )
      e.removeAttributeNode(t[0]);
    Ks(e);
  }
  var kt = /* @__PURE__ */ new Map(), Em = /* @__PURE__ */ new Set();
  function Vr(e) {
    return typeof e.getRootNode == "function" ? e.getRootNode() : e.nodeType === 9 ? e : e.ownerDocument;
  }
  var Hn = x.d;
  x.d = {
    f: vv,
    r: Sv,
    D: bv,
    C: Ev,
    L: wv,
    m: Av,
    X: Rv,
    S: Ov,
    M: zv
  };
  function vv() {
    var e = Hn.f(), t = Br();
    return e || t;
  }
  function Sv(e) {
    var t = Ll(e);
    t !== null && t.tag === 5 && t.type === "form" ? Cd(t) : Hn.r(e);
  }
  var ga = typeof document > "u" ? null : document;
  function wm(e, t, n) {
    var a = ga;
    if (a && typeof t == "string" && t) {
      var r = Zt(t);
      r = 'link[rel="' + e + '"][href="' + r + '"]', typeof n == "string" && (r += '[crossorigin="' + n + '"]'), Em.has(r) || (Em.add(r), e = { rel: e, crossOrigin: n, href: t }, a.querySelector(r) === null && (t = a.createElement("link"), dt(t, "link", e), at(t), a.head.appendChild(t)));
    }
  }
  function bv(e) {
    Hn.D(e), wm("dns-prefetch", e, null);
  }
  function Ev(e, t) {
    Hn.C(e, t), wm("preconnect", e, t);
  }
  function wv(e, t, n) {
    Hn.L(e, t, n);
    var a = ga;
    if (a && e && t) {
      var r = 'link[rel="preload"][as="' + Zt(t) + '"]';
      t === "image" && n && n.imageSrcSet ? (r += '[imagesrcset="' + Zt(
        n.imageSrcSet
      ) + '"]', typeof n.imageSizes == "string" && (r += '[imagesizes="' + Zt(
        n.imageSizes
      ) + '"]')) : r += '[href="' + Zt(e) + '"]';
      var u = r;
      switch (t) {
        case "style":
          u = va(e);
          break;
        case "script":
          u = Sa(e);
      }
      kt.has(u) || (e = w(
        {
          rel: "preload",
          href: t === "image" && n && n.imageSrcSet ? void 0 : e,
          as: t
        },
        n
      ), kt.set(u, e), a.querySelector(r) !== null || t === "style" && a.querySelector(pi(u)) || t === "script" && a.querySelector(yi(u)) || (t = a.createElement("link"), dt(t, "link", e), at(t), a.head.appendChild(t)));
    }
  }
  function Av(e, t) {
    Hn.m(e, t);
    var n = ga;
    if (n && e) {
      var a = t && typeof t.as == "string" ? t.as : "script", r = 'link[rel="modulepreload"][as="' + Zt(a) + '"][href="' + Zt(e) + '"]', u = r;
      switch (a) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          u = Sa(e);
      }
      if (!kt.has(u) && (e = w({ rel: "modulepreload", href: e }, t), kt.set(u, e), n.querySelector(r) === null)) {
        switch (a) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (n.querySelector(yi(u)))
              return;
        }
        a = n.createElement("link"), dt(a, "link", e), at(a), n.head.appendChild(a);
      }
    }
  }
  function Ov(e, t, n) {
    Hn.S(e, t, n);
    var a = ga;
    if (a && e) {
      var r = Xl(a).hoistableStyles, u = va(e);
      t = t || "default";
      var f = r.get(u);
      if (!f) {
        var h = { loading: 0, preload: null };
        if (f = a.querySelector(
          pi(u)
        ))
          h.loading = 5;
        else {
          e = w(
            { rel: "stylesheet", href: e, "data-precedence": t },
            n
          ), (n = kt.get(u)) && Vc(e, n);
          var y = f = a.createElement("link");
          at(y), dt(y, "link", e), y._p = new Promise(function(R, M) {
            y.onload = R, y.onerror = M;
          }), y.addEventListener("load", function() {
            h.loading |= 1;
          }), y.addEventListener("error", function() {
            h.loading |= 2;
          }), h.loading |= 4, Kr(f, t, a);
        }
        f = {
          type: "stylesheet",
          instance: f,
          count: 1,
          state: h
        }, r.set(u, f);
      }
    }
  }
  function Rv(e, t) {
    Hn.X(e, t);
    var n = ga;
    if (n && e) {
      var a = Xl(n).hoistableScripts, r = Sa(e), u = a.get(r);
      u || (u = n.querySelector(yi(r)), u || (e = w({ src: e, async: !0 }, t), (t = kt.get(r)) && Kc(e, t), u = n.createElement("script"), at(u), dt(u, "link", e), n.head.appendChild(u)), u = {
        type: "script",
        instance: u,
        count: 1,
        state: null
      }, a.set(r, u));
    }
  }
  function zv(e, t) {
    Hn.M(e, t);
    var n = ga;
    if (n && e) {
      var a = Xl(n).hoistableScripts, r = Sa(e), u = a.get(r);
      u || (u = n.querySelector(yi(r)), u || (e = w({ src: e, async: !0, type: "module" }, t), (t = kt.get(r)) && Kc(e, t), u = n.createElement("script"), at(u), dt(u, "link", e), n.head.appendChild(u)), u = {
        type: "script",
        instance: u,
        count: 1,
        state: null
      }, a.set(r, u));
    }
  }
  function Am(e, t, n, a) {
    var r = (r = Pe.current) ? Vr(r) : null;
    if (!r) throw Error(c(446));
    switch (e) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof n.precedence == "string" && typeof n.href == "string" ? (t = va(n.href), n = Xl(
          r
        ).hoistableStyles, a = n.get(t), a || (a = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, n.set(t, a)), a) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (n.rel === "stylesheet" && typeof n.href == "string" && typeof n.precedence == "string") {
          e = va(n.href);
          var u = Xl(
            r
          ).hoistableStyles, f = u.get(e);
          if (f || (r = r.ownerDocument || r, f = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, u.set(e, f), (u = r.querySelector(
            pi(e)
          )) && !u._p && (f.instance = u, f.state.loading = 5), kt.has(e) || (n = {
            rel: "preload",
            as: "style",
            href: n.href,
            crossOrigin: n.crossOrigin,
            integrity: n.integrity,
            media: n.media,
            hrefLang: n.hrefLang,
            referrerPolicy: n.referrerPolicy
          }, kt.set(e, n), u || Dv(
            r,
            e,
            n,
            f.state
          ))), t && a === null)
            throw Error(c(528, ""));
          return f;
        }
        if (t && a !== null)
          throw Error(c(529, ""));
        return null;
      case "script":
        return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = Sa(n), n = Xl(
          r
        ).hoistableScripts, a = n.get(t), a || (a = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, n.set(t, a)), a) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(c(444, e));
    }
  }
  function va(e) {
    return 'href="' + Zt(e) + '"';
  }
  function pi(e) {
    return 'link[rel="stylesheet"][' + e + "]";
  }
  function Om(e) {
    return w({}, e, {
      "data-precedence": e.precedence,
      precedence: null
    });
  }
  function Dv(e, t, n, a) {
    e.querySelector('link[rel="preload"][as="style"][' + t + "]") ? a.loading = 1 : (t = e.createElement("link"), a.preload = t, t.addEventListener("load", function() {
      return a.loading |= 1;
    }), t.addEventListener("error", function() {
      return a.loading |= 2;
    }), dt(t, "link", n), at(t), e.head.appendChild(t));
  }
  function Sa(e) {
    return '[src="' + Zt(e) + '"]';
  }
  function yi(e) {
    return "script[async]" + e;
  }
  function Rm(e, t, n) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var a = e.querySelector(
            'style[data-href~="' + Zt(n.href) + '"]'
          );
          if (a)
            return t.instance = a, at(a), a;
          var r = w({}, n, {
            "data-href": n.href,
            "data-precedence": n.precedence,
            href: null,
            precedence: null
          });
          return a = (e.ownerDocument || e).createElement(
            "style"
          ), at(a), dt(a, "style", r), Kr(a, n.precedence, e), t.instance = a;
        case "stylesheet":
          r = va(n.href);
          var u = e.querySelector(
            pi(r)
          );
          if (u)
            return t.state.loading |= 4, t.instance = u, at(u), u;
          a = Om(n), (r = kt.get(r)) && Vc(a, r), u = (e.ownerDocument || e).createElement("link"), at(u);
          var f = u;
          return f._p = new Promise(function(h, y) {
            f.onload = h, f.onerror = y;
          }), dt(u, "link", a), t.state.loading |= 4, Kr(u, n.precedence, e), t.instance = u;
        case "script":
          return u = Sa(n.src), (r = e.querySelector(
            yi(u)
          )) ? (t.instance = r, at(r), r) : (a = n, (r = kt.get(u)) && (a = w({}, n), Kc(a, r)), e = e.ownerDocument || e, r = e.createElement("script"), at(r), dt(r, "link", a), e.head.appendChild(r), t.instance = r);
        case "void":
          return null;
        default:
          throw Error(c(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (a = t.instance, t.state.loading |= 4, Kr(a, n.precedence, e));
    return t.instance;
  }
  function Kr(e, t, n) {
    for (var a = n.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), r = a.length ? a[a.length - 1] : null, u = r, f = 0; f < a.length; f++) {
      var h = a[f];
      if (h.dataset.precedence === t) u = h;
      else if (u !== r) break;
    }
    u ? u.parentNode.insertBefore(e, u.nextSibling) : (t = n.nodeType === 9 ? n.head : n, t.insertBefore(e, t.firstChild));
  }
  function Vc(e, t) {
    e.crossOrigin == null && (e.crossOrigin = t.crossOrigin), e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy), e.title == null && (e.title = t.title);
  }
  function Kc(e, t) {
    e.crossOrigin == null && (e.crossOrigin = t.crossOrigin), e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy), e.integrity == null && (e.integrity = t.integrity);
  }
  var Pr = null;
  function zm(e, t, n) {
    if (Pr === null) {
      var a = /* @__PURE__ */ new Map(), r = Pr = /* @__PURE__ */ new Map();
      r.set(n, a);
    } else
      r = Pr, a = r.get(n), a || (a = /* @__PURE__ */ new Map(), r.set(n, a));
    if (a.has(e)) return a;
    for (a.set(e, null), n = n.getElementsByTagName(e), r = 0; r < n.length; r++) {
      var u = n[r];
      if (!(u[xa] || u[ut] || e === "link" && u.getAttribute("rel") === "stylesheet") && u.namespaceURI !== "http://www.w3.org/2000/svg") {
        var f = u.getAttribute(t) || "";
        f = e + f;
        var h = a.get(f);
        h ? h.push(u) : a.set(f, [u]);
      }
    }
    return a;
  }
  function Dm(e, t, n) {
    e = e.ownerDocument || e, e.head.insertBefore(
      n,
      t === "title" ? e.querySelector("head > title") : null
    );
  }
  function Mv(e, t, n) {
    if (n === 1 || t.itemProp != null) return !1;
    switch (e) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "")
          break;
        return !0;
      case "link":
        if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError)
          break;
        return t.rel === "stylesheet" ? (e = t.disabled, typeof t.precedence == "string" && e == null) : !0;
      case "script":
        if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string")
          return !0;
    }
    return !1;
  }
  function Mm(e) {
    return !(e.type === "stylesheet" && (e.state.loading & 3) === 0);
  }
  function Tv(e, t, n, a) {
    if (n.type === "stylesheet" && (typeof a.media != "string" || matchMedia(a.media).matches !== !1) && (n.state.loading & 4) === 0) {
      if (n.instance === null) {
        var r = va(a.href), u = t.querySelector(
          pi(r)
        );
        if (u) {
          t = u._p, t !== null && typeof t == "object" && typeof t.then == "function" && (e.count++, e = Jr.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = u, at(u);
          return;
        }
        u = t.ownerDocument || t, a = Om(a), (r = kt.get(r)) && Vc(a, r), u = u.createElement("link"), at(u);
        var f = u;
        f._p = new Promise(function(h, y) {
          f.onload = h, f.onerror = y;
        }), dt(u, "link", a), n.instance = u;
      }
      e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(n, t), (t = n.state.preload) && (n.state.loading & 3) === 0 && (e.count++, n = Jr.bind(e), t.addEventListener("load", n), t.addEventListener("error", n));
    }
  }
  var Pc = 0;
  function Uv(e, t) {
    return e.stylesheets && e.count === 0 && $r(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(n) {
      var a = setTimeout(function() {
        if (e.stylesheets && $r(e, e.stylesheets), e.unsuspend) {
          var u = e.unsuspend;
          e.unsuspend = null, u();
        }
      }, 6e4 + t);
      0 < e.imgBytes && Pc === 0 && (Pc = 62500 * fv());
      var r = setTimeout(
        function() {
          if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && $r(e, e.stylesheets), e.unsuspend)) {
            var u = e.unsuspend;
            e.unsuspend = null, u();
          }
        },
        (e.imgBytes > Pc ? 50 : 800) + t
      );
      return e.unsuspend = n, function() {
        e.unsuspend = null, clearTimeout(a), clearTimeout(r);
      };
    } : null;
  }
  function Jr() {
    if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
      if (this.stylesheets) $r(this, this.stylesheets);
      else if (this.unsuspend) {
        var e = this.unsuspend;
        this.unsuspend = null, e();
      }
    }
  }
  var Fr = null;
  function $r(e, t) {
    e.stylesheets = null, e.unsuspend !== null && (e.count++, Fr = /* @__PURE__ */ new Map(), t.forEach(Nv, e), Fr = null, Jr.call(e));
  }
  function Nv(e, t) {
    if (!(t.state.loading & 4)) {
      var n = Fr.get(e);
      if (n) var a = n.get(null);
      else {
        n = /* @__PURE__ */ new Map(), Fr.set(e, n);
        for (var r = e.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), u = 0; u < r.length; u++) {
          var f = r[u];
          (f.nodeName === "LINK" || f.getAttribute("media") !== "not all") && (n.set(f.dataset.precedence, f), a = f);
        }
        a && n.set(null, a);
      }
      r = t.instance, f = r.getAttribute("data-precedence"), u = n.get(f) || a, u === a && n.set(null, r), n.set(f, r), this.count++, a = Jr.bind(this), r.addEventListener("load", a), r.addEventListener("error", a), u ? u.parentNode.insertBefore(r, u.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(r, e.firstChild)), t.state.loading |= 4;
    }
  }
  var gi = {
    $$typeof: me,
    Provider: null,
    Consumer: null,
    _currentValue: L,
    _currentValue2: L,
    _threadCount: 0
  };
  function xv(e, t, n, a, r, u, f, h, y) {
    this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Qs(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Qs(0), this.hiddenUpdates = Qs(null), this.identifierPrefix = a, this.onUncaughtError = r, this.onCaughtError = u, this.onRecoverableError = f, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = y, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Tm(e, t, n, a, r, u, f, h, y, R, M, U) {
    return e = new xv(
      e,
      t,
      n,
      f,
      y,
      R,
      M,
      U,
      h
    ), t = 1, u === !0 && (t |= 24), u = jt(3, null, null, t), e.current = u, u.stateNode = e, t = zu(), t.refCount++, e.pooledCache = t, t.refCount++, u.memoizedState = {
      element: a,
      isDehydrated: n,
      cache: t
    }, Uu(u), e;
  }
  function Um(e) {
    return e ? (e = $l, e) : $l;
  }
  function Nm(e, t, n, a, r, u) {
    r = Um(r), a.context === null ? a.context = r : a.pendingContext = r, a = Kn(t), a.payload = { element: n }, u = u === void 0 ? null : u, u !== null && (a.callback = u), n = Pn(e, a, t), n !== null && (zt(n, e, t), Fa(n, e, t));
  }
  function xm(e, t) {
    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
      var n = e.retryLane;
      e.retryLane = n !== 0 && n < t ? n : t;
    }
  }
  function Jc(e, t) {
    xm(e, t), (e = e.alternate) && xm(e, t);
  }
  function qm(e) {
    if (e.tag === 13 || e.tag === 31) {
      var t = bl(e, 67108864);
      t !== null && zt(t, e, 67108864), Jc(e, 67108864);
    }
  }
  function jm(e) {
    if (e.tag === 13 || e.tag === 31) {
      var t = Lt();
      t = Gs(t);
      var n = bl(e, t);
      n !== null && zt(n, e, t), Jc(e, t);
    }
  }
  var Wr = !0;
  function qv(e, t, n, a) {
    var r = b.T;
    b.T = null;
    var u = x.p;
    try {
      x.p = 2, Fc(e, t, n, a);
    } finally {
      x.p = u, b.T = r;
    }
  }
  function jv(e, t, n, a) {
    var r = b.T;
    b.T = null;
    var u = x.p;
    try {
      x.p = 8, Fc(e, t, n, a);
    } finally {
      x.p = u, b.T = r;
    }
  }
  function Fc(e, t, n, a) {
    if (Wr) {
      var r = $c(a);
      if (r === null)
        Hc(
          e,
          t,
          a,
          kr,
          n
        ), Bm(e, a);
      else if (Bv(
        r,
        e,
        t,
        n,
        a
      ))
        a.stopPropagation();
      else if (Bm(e, a), t & 4 && -1 < Hv.indexOf(e)) {
        for (; r !== null; ) {
          var u = Ll(r);
          if (u !== null)
            switch (u.tag) {
              case 3:
                if (u = u.stateNode, u.current.memoizedState.isDehydrated) {
                  var f = pl(u.pendingLanes);
                  if (f !== 0) {
                    var h = u;
                    for (h.pendingLanes |= 2, h.entangledLanes |= 2; f; ) {
                      var y = 1 << 31 - xt(f);
                      h.entanglements[1] |= y, f &= ~y;
                    }
                    dn(u), (Re & 6) === 0 && (jr = st() + 500, oi(0));
                  }
                }
                break;
              case 31:
              case 13:
                h = bl(u, 2), h !== null && zt(h, u, 2), Br(), Jc(u, 2);
            }
          if (u = $c(a), u === null && Hc(
            e,
            t,
            a,
            kr,
            n
          ), u === r) break;
          r = u;
        }
        r !== null && a.stopPropagation();
      } else
        Hc(
          e,
          t,
          a,
          null,
          n
        );
    }
  }
  function $c(e) {
    return e = ks(e), Wc(e);
  }
  var kr = null;
  function Wc(e) {
    if (kr = null, e = Cl(e), e !== null) {
      var t = p(e);
      if (t === null) e = null;
      else {
        var n = t.tag;
        if (n === 13) {
          if (e = d(t), e !== null) return e;
          e = null;
        } else if (n === 31) {
          if (e = m(t), e !== null) return e;
          e = null;
        } else if (n === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          e = null;
        } else t !== e && (e = null);
      }
    }
    return kr = e, null;
  }
  function Hm(e) {
    switch (e) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (ml()) {
          case Fe:
            return 2;
          case gn:
            return 8;
          case Bl:
          case Ma:
            return 32;
          case Zf:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var kc = !1, al = null, il = null, rl = null, vi = /* @__PURE__ */ new Map(), Si = /* @__PURE__ */ new Map(), sl = [], Hv = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Bm(e, t) {
    switch (e) {
      case "focusin":
      case "focusout":
        al = null;
        break;
      case "dragenter":
      case "dragleave":
        il = null;
        break;
      case "mouseover":
      case "mouseout":
        rl = null;
        break;
      case "pointerover":
      case "pointerout":
        vi.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Si.delete(t.pointerId);
    }
  }
  function bi(e, t, n, a, r, u) {
    return e === null || e.nativeEvent !== u ? (e = {
      blockedOn: t,
      domEventName: n,
      eventSystemFlags: a,
      nativeEvent: u,
      targetContainers: [r]
    }, t !== null && (t = Ll(t), t !== null && qm(t)), e) : (e.eventSystemFlags |= a, t = e.targetContainers, r !== null && t.indexOf(r) === -1 && t.push(r), e);
  }
  function Bv(e, t, n, a, r) {
    switch (t) {
      case "focusin":
        return al = bi(
          al,
          e,
          t,
          n,
          a,
          r
        ), !0;
      case "dragenter":
        return il = bi(
          il,
          e,
          t,
          n,
          a,
          r
        ), !0;
      case "mouseover":
        return rl = bi(
          rl,
          e,
          t,
          n,
          a,
          r
        ), !0;
      case "pointerover":
        var u = r.pointerId;
        return vi.set(
          u,
          bi(
            vi.get(u) || null,
            e,
            t,
            n,
            a,
            r
          )
        ), !0;
      case "gotpointercapture":
        return u = r.pointerId, Si.set(
          u,
          bi(
            Si.get(u) || null,
            e,
            t,
            n,
            a,
            r
          )
        ), !0;
    }
    return !1;
  }
  function _m(e) {
    var t = Cl(e.target);
    if (t !== null) {
      var n = p(t);
      if (n !== null) {
        if (t = n.tag, t === 13) {
          if (t = d(n), t !== null) {
            e.blockedOn = t, $f(e.priority, function() {
              jm(n);
            });
            return;
          }
        } else if (t === 31) {
          if (t = m(n), t !== null) {
            e.blockedOn = t, $f(e.priority, function() {
              jm(n);
            });
            return;
          }
        } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
          e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
          return;
        }
      }
    }
    e.blockedOn = null;
  }
  function Ir(e) {
    if (e.blockedOn !== null) return !1;
    for (var t = e.targetContainers; 0 < t.length; ) {
      var n = $c(e.nativeEvent);
      if (n === null) {
        n = e.nativeEvent;
        var a = new n.constructor(
          n.type,
          n
        );
        Ws = a, n.target.dispatchEvent(a), Ws = null;
      } else
        return t = Ll(n), t !== null && qm(t), e.blockedOn = n, !1;
      t.shift();
    }
    return !0;
  }
  function Cm(e, t, n) {
    Ir(e) && n.delete(t);
  }
  function _v() {
    kc = !1, al !== null && Ir(al) && (al = null), il !== null && Ir(il) && (il = null), rl !== null && Ir(rl) && (rl = null), vi.forEach(Cm), Si.forEach(Cm);
  }
  function es(e, t) {
    e.blockedOn === t && (e.blockedOn = null, kc || (kc = !0, l.unstable_scheduleCallback(
      l.unstable_NormalPriority,
      _v
    )));
  }
  var ts = null;
  function Lm(e) {
    ts !== e && (ts = e, l.unstable_scheduleCallback(
      l.unstable_NormalPriority,
      function() {
        ts === e && (ts = null);
        for (var t = 0; t < e.length; t += 3) {
          var n = e[t], a = e[t + 1], r = e[t + 2];
          if (typeof a != "function") {
            if (Wc(a || n) === null)
              continue;
            break;
          }
          var u = Ll(n);
          u !== null && (e.splice(t, 3), t -= 3, $u(
            u,
            {
              pending: !0,
              data: r,
              method: n.method,
              action: a
            },
            a,
            r
          ));
        }
      }
    ));
  }
  function ba(e) {
    function t(y) {
      return es(y, e);
    }
    al !== null && es(al, e), il !== null && es(il, e), rl !== null && es(rl, e), vi.forEach(t), Si.forEach(t);
    for (var n = 0; n < sl.length; n++) {
      var a = sl[n];
      a.blockedOn === e && (a.blockedOn = null);
    }
    for (; 0 < sl.length && (n = sl[0], n.blockedOn === null); )
      _m(n), n.blockedOn === null && sl.shift();
    if (n = (e.ownerDocument || e).$$reactFormReplay, n != null)
      for (a = 0; a < n.length; a += 3) {
        var r = n[a], u = n[a + 1], f = r[bt] || null;
        if (typeof u == "function")
          f || Lm(n);
        else if (f) {
          var h = null;
          if (u && u.hasAttribute("formAction")) {
            if (r = u, f = u[bt] || null)
              h = f.formAction;
            else if (Wc(r) !== null) continue;
          } else h = f.action;
          typeof h == "function" ? n[a + 1] = h : (n.splice(a, 3), a -= 3), Lm(n);
        }
      }
  }
  function Xm() {
    function e(u) {
      u.canIntercept && u.info === "react-transition" && u.intercept({
        handler: function() {
          return new Promise(function(f) {
            return r = f;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function t() {
      r !== null && (r(), r = null), a || setTimeout(n, 20);
    }
    function n() {
      if (!a && !navigation.transition) {
        var u = navigation.currentEntry;
        u && u.url != null && navigation.navigate(u.url, {
          state: u.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var a = !1, r = null;
      return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(n, 100), function() {
        a = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), r !== null && (r(), r = null);
      };
    }
  }
  function Ic(e) {
    this._internalRoot = e;
  }
  ns.prototype.render = Ic.prototype.render = function(e) {
    var t = this._internalRoot;
    if (t === null) throw Error(c(409));
    var n = t.current, a = Lt();
    Nm(n, a, e, t, null, null);
  }, ns.prototype.unmount = Ic.prototype.unmount = function() {
    var e = this._internalRoot;
    if (e !== null) {
      this._internalRoot = null;
      var t = e.containerInfo;
      Nm(e.current, 2, null, e, null, null), Br(), t[_l] = null;
    }
  };
  function ns(e) {
    this._internalRoot = e;
  }
  ns.prototype.unstable_scheduleHydration = function(e) {
    if (e) {
      var t = Ff();
      e = { blockedOn: null, target: e, priority: t };
      for (var n = 0; n < sl.length && t !== 0 && t < sl[n].priority; n++) ;
      sl.splice(n, 0, e), n === 0 && _m(e);
    }
  };
  var Ym = i.version;
  if (Ym !== "19.2.5")
    throw Error(
      c(
        527,
        Ym,
        "19.2.5"
      )
    );
  x.findDOMNode = function(e) {
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == "function" ? Error(c(188)) : (e = Object.keys(e).join(","), Error(c(268, e)));
    return e = S(t), e = e !== null ? A(e) : null, e = e === null ? null : e.stateNode, e;
  };
  var Cv = {
    bundleType: 0,
    version: "19.2.5",
    rendererPackageName: "react-dom",
    currentDispatcherRef: b,
    reconcilerVersion: "19.2.5"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var ls = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!ls.isDisabled && ls.supportsFiber)
      try {
        Ta = ls.inject(
          Cv
        ), Nt = ls;
      } catch {
      }
  }
  return Ri.createRoot = function(e, t) {
    if (!o(e)) throw Error(c(299));
    var n = !1, a = "", r = Jd, u = Fd, f = $d;
    return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (a = t.identifierPrefix), t.onUncaughtError !== void 0 && (r = t.onUncaughtError), t.onCaughtError !== void 0 && (u = t.onCaughtError), t.onRecoverableError !== void 0 && (f = t.onRecoverableError)), t = Tm(
      e,
      1,
      !1,
      null,
      null,
      n,
      a,
      null,
      r,
      u,
      f,
      Xm
    ), e[_l] = t.current, jc(e), new Ic(t);
  }, Ri.hydrateRoot = function(e, t, n) {
    if (!o(e)) throw Error(c(299));
    var a = !1, r = "", u = Jd, f = Fd, h = $d, y = null;
    return n != null && (n.unstable_strictMode === !0 && (a = !0), n.identifierPrefix !== void 0 && (r = n.identifierPrefix), n.onUncaughtError !== void 0 && (u = n.onUncaughtError), n.onCaughtError !== void 0 && (f = n.onCaughtError), n.onRecoverableError !== void 0 && (h = n.onRecoverableError), n.formState !== void 0 && (y = n.formState)), t = Tm(
      e,
      1,
      !0,
      t,
      n ?? null,
      a,
      r,
      y,
      u,
      f,
      h,
      Xm
    ), t.context = Um(null), n = t.current, a = Lt(), a = Gs(a), r = Kn(a), r.callback = null, Pn(n, r, a), n = a, t.current.lanes = n, Na(t, n), dn(t), e[_l] = t.current, jc(e), new ns(t);
  }, Ri.version = "19.2.5", Ri;
}
var pp;
function y1() {
  if (pp) return uf.exports;
  pp = 1;
  function l() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(l);
      } catch (i) {
        console.error(i);
      }
  }
  return l(), uf.exports = p1(), uf.exports;
}
y1();
function Hs(l) {
  return l === "__proto__";
}
function Jy(l) {
  switch (typeof l) {
    case "number":
    case "symbol":
      return !1;
    case "string":
      return l.includes(".") || l.includes("[") || l.includes("]");
  }
}
function Qf(l) {
  return typeof l == "string" || typeof l == "symbol" ? l : Object.is(l?.valueOf?.(), -0) ? "-0" : String(l);
}
function Fy(l) {
  if (l == null)
    return "";
  if (typeof l == "string")
    return l;
  if (Array.isArray(l))
    return l.map(Fy).join(",");
  const i = String(l);
  return i === "0" && Object.is(Number(l), -0) ? "-0" : i;
}
function Gf(l) {
  if (Array.isArray(l))
    return l.map(Qf);
  if (typeof l == "symbol")
    return [l];
  l = Fy(l);
  const i = [], s = l.length;
  if (s === 0)
    return i;
  let c = 0, o = "", p = "", d = !1;
  for (l.charCodeAt(0) === 46 && (i.push(""), c++); c < s; ) {
    const m = l[c];
    p ? m === "\\" && c + 1 < s ? (c++, o += l[c]) : m === p ? p = "" : o += m : d ? m === '"' || m === "'" ? p = m : m === "]" ? (d = !1, i.push(o), o = "") : o += m : m === "[" ? (d = !0, o && (i.push(o), o = "")) : m === "." ? o && (i.push(o), o = "") : o += m, c++;
  }
  return o && i.push(o), i;
}
function Li(l, i, s) {
  if (l == null)
    return s;
  switch (typeof i) {
    case "string": {
      if (Hs(i))
        return s;
      const c = l[i];
      return c === void 0 ? Jy(i) ? Li(l, Gf(i), s) : s : c;
    }
    case "number":
    case "symbol": {
      typeof i == "number" && (i = Qf(i));
      const c = l[i];
      return c === void 0 ? s : c;
    }
    default: {
      if (Array.isArray(i))
        return g1(l, i, s);
      if (Object.is(i?.valueOf(), -0) ? i = "-0" : i = String(i), Hs(i))
        return s;
      const c = l[i];
      return c === void 0 ? s : c;
    }
  }
}
function g1(l, i, s) {
  if (i.length === 0)
    return s;
  let c = l;
  for (let o = 0; o < i.length; o++) {
    if (c == null || Hs(i[o]))
      return s;
    c = c[i[o]];
  }
  return c === void 0 ? s : c;
}
function yp(l) {
  return l !== null && (typeof l == "object" || typeof l == "function");
}
function v1(l) {
  return l == null || typeof l != "object" && typeof l != "function";
}
function $y(l, i) {
  return l === i || Number.isNaN(l) && Number.isNaN(i);
}
function Df(l) {
  return Object.getOwnPropertySymbols(l).filter((i) => Object.prototype.propertyIsEnumerable.call(l, i));
}
function Bs(l) {
  return l == null ? l === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(l);
}
const Wy = "[object RegExp]", ky = "[object String]", Iy = "[object Number]", eg = "[object Boolean]", Mf = "[object Arguments]", tg = "[object Symbol]", ng = "[object Date]", lg = "[object Map]", ag = "[object Set]", ig = "[object Array]", S1 = "[object Function]", rg = "[object ArrayBuffer]", vs = "[object Object]", b1 = "[object Error]", sg = "[object DataView]", ug = "[object Uint8Array]", cg = "[object Uint8ClampedArray]", fg = "[object Uint16Array]", og = "[object Uint32Array]", E1 = "[object BigUint64Array]", dg = "[object Int8Array]", hg = "[object Int16Array]", mg = "[object Int32Array]", w1 = "[object BigInt64Array]", pg = "[object Float32Array]", yg = "[object Float64Array]", gp = typeof globalThis == "object" && globalThis || typeof window == "object" && window || typeof self == "object" && self || typeof global == "object" && global || /* @__PURE__ */ (function() {
  return this;
})() || Function("return this")();
function Tf(l) {
  return typeof gp.Buffer < "u" && gp.Buffer.isBuffer(l);
}
function A1(l) {
  return ArrayBuffer.isView(l) && !(l instanceof DataView);
}
function za(l, i, s, c = /* @__PURE__ */ new Map(), o = void 0) {
  const p = o?.(l, i, s, c);
  if (p !== void 0)
    return p;
  if (v1(l))
    return l;
  if (c.has(l))
    return c.get(l);
  if (Array.isArray(l)) {
    const d = new Array(l.length);
    c.set(l, d);
    for (let m = 0; m < l.length; m++)
      d[m] = za(l[m], m, s, c, o);
    return Object.hasOwn(l, "index") && (d.index = l.index), Object.hasOwn(l, "input") && (d.input = l.input), d;
  }
  if (l instanceof Date)
    return new Date(l.getTime());
  if (l instanceof RegExp) {
    const d = new RegExp(l.source, l.flags);
    return d.lastIndex = l.lastIndex, d;
  }
  if (l instanceof Map) {
    const d = /* @__PURE__ */ new Map();
    c.set(l, d);
    for (const [m, g] of l)
      d.set(m, za(g, m, s, c, o));
    return d;
  }
  if (l instanceof Set) {
    const d = /* @__PURE__ */ new Set();
    c.set(l, d);
    for (const m of l)
      d.add(za(m, void 0, s, c, o));
    return d;
  }
  if (Tf(l))
    return l.subarray();
  if (A1(l)) {
    const d = new (Object.getPrototypeOf(l)).constructor(l.length);
    c.set(l, d);
    for (let m = 0; m < l.length; m++)
      d[m] = za(l[m], m, s, c, o);
    return d;
  }
  if (l instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && l instanceof SharedArrayBuffer)
    return l.slice(0);
  if (l instanceof DataView) {
    const d = new DataView(l.buffer.slice(0), l.byteOffset, l.byteLength);
    return c.set(l, d), ol(d, l, s, c, o), d;
  }
  if (typeof File < "u" && l instanceof File) {
    const d = new File([l], l.name, {
      type: l.type
    });
    return c.set(l, d), ol(d, l, s, c, o), d;
  }
  if (typeof Blob < "u" && l instanceof Blob) {
    const d = new Blob([l], { type: l.type });
    return c.set(l, d), ol(d, l, s, c, o), d;
  }
  if (l instanceof Error) {
    const d = structuredClone(l);
    return c.set(l, d), d.message = l.message, d.name = l.name, d.stack = l.stack, d.cause = l.cause, d.constructor = l.constructor, ol(d, l, s, c, o), d;
  }
  if (l instanceof Boolean) {
    const d = new Boolean(l.valueOf());
    return c.set(l, d), ol(d, l, s, c, o), d;
  }
  if (l instanceof Number) {
    const d = new Number(l.valueOf());
    return c.set(l, d), ol(d, l, s, c, o), d;
  }
  if (l instanceof String) {
    const d = new String(l.valueOf());
    return c.set(l, d), ol(d, l, s, c, o), d;
  }
  if (typeof l == "object" && O1(l)) {
    const d = Object.create(Object.getPrototypeOf(l));
    return c.set(l, d), ol(d, l, s, c, o), d;
  }
  return l;
}
function ol(l, i, s = l, c, o) {
  const p = [...Object.keys(i), ...Df(i)];
  for (let d = 0; d < p.length; d++) {
    const m = p[d], g = Object.getOwnPropertyDescriptor(l, m);
    (g == null || g.writable) && (l[m] = za(i[m], m, s, c, o));
  }
}
function O1(l) {
  switch (Bs(l)) {
    case Mf:
    case ig:
    case rg:
    case sg:
    case eg:
    case ng:
    case pg:
    case yg:
    case dg:
    case hg:
    case mg:
    case lg:
    case Iy:
    case vs:
    case Wy:
    case ag:
    case ky:
    case tg:
    case ug:
    case cg:
    case fg:
    case og:
      return !0;
    default:
      return !1;
  }
}
function Yt(l) {
  return za(l, void 0, l, /* @__PURE__ */ new Map(), void 0);
}
const R1 = /^(?:0|[1-9]\d*)$/;
function gg(l, i = Number.MAX_SAFE_INTEGER) {
  switch (typeof l) {
    case "number":
      return Number.isInteger(l) && l >= 0 && l < i;
    case "symbol":
      return !1;
    case "string":
      return R1.test(l);
  }
}
function z1(l) {
  return l !== null && typeof l == "object" && Bs(l) === "[object Arguments]";
}
function vp(l, i) {
  let s;
  if (Array.isArray(i) ? s = i : typeof i == "string" && Jy(i) && l?.[i] == null ? s = Gf(i) : s = [i], s.length === 0)
    return !1;
  let c = l;
  for (let o = 0; o < s.length; o++) {
    const p = s[o];
    if ((c == null || !Object.hasOwn(c, p)) && !((Array.isArray(c) || z1(c)) && gg(p) && p < c.length))
      return !1;
    c = c[p];
  }
  return !0;
}
function D1(l) {
  return typeof l == "symbol" || l instanceof Symbol;
}
const M1 = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, T1 = /^\w*$/;
function U1(l, i) {
  return Array.isArray(l) ? !1 : typeof l == "number" || typeof l == "boolean" || l == null || D1(l) ? !0 : typeof l == "string" && (T1.test(l) || !M1.test(l)) || i != null && Object.hasOwn(i, l);
}
const N1 = (l, i, s) => {
  const c = l[i];
  (!(Object.hasOwn(l, i) && $y(c, s)) || s === void 0 && !(i in l)) && (l[i] = s);
};
function x1(l, i, s, c) {
  if (l == null && !yp(l))
    return l;
  let o;
  U1(i, l) ? o = [i] : Array.isArray(i) ? o = i : o = Gf(i);
  const p = s(Li(l, o));
  let d = l;
  for (let m = 0; m < o.length && d != null; m++) {
    const g = Qf(o[m]);
    if (Hs(g))
      continue;
    let S;
    if (m === o.length - 1)
      S = p;
    else {
      const A = d[g], w = c?.(A, g, l);
      S = w !== void 0 ? w : yp(A) ? A : gg(o[m + 1]) ? [] : {};
    }
    N1(d, g, S), d = d[g];
  }
  return l;
}
function rs(l, i, s) {
  return x1(l, i, () => s, () => {
  });
}
function Sp(l) {
  if (!l || typeof l != "object")
    return !1;
  const i = Object.getPrototypeOf(l);
  return i === null || i === Object.prototype || Object.getPrototypeOf(i) === null ? Object.prototype.toString.call(l) === "[object Object]" : !1;
}
function q1(l, i, s) {
  return qi(l, i, void 0, void 0, void 0, void 0, s);
}
function qi(l, i, s, c, o, p, d) {
  const m = d(l, i, s, c, o, p);
  if (m !== void 0)
    return m;
  if (typeof l == typeof i)
    switch (typeof l) {
      case "bigint":
      case "string":
      case "boolean":
      case "symbol":
      case "undefined":
        return l === i;
      case "number":
        return l === i || Object.is(l, i);
      case "function":
        return l === i;
      case "object":
        return Xi(l, i, p, d);
    }
  return Xi(l, i, p, d);
}
function Xi(l, i, s, c) {
  if (Object.is(l, i))
    return !0;
  let o = Bs(l), p = Bs(i);
  if (o === Mf && (o = vs), p === Mf && (p = vs), o !== p)
    return !1;
  switch (o) {
    case ky:
      return l.toString() === i.toString();
    case Iy: {
      const g = l.valueOf(), S = i.valueOf();
      return $y(g, S);
    }
    case eg:
    case ng:
    case tg:
      return Object.is(l.valueOf(), i.valueOf());
    case Wy:
      return l.source === i.source && l.flags === i.flags;
    case S1:
      return l === i;
  }
  s = s ?? /* @__PURE__ */ new Map();
  const d = s.get(l), m = s.get(i);
  if (d != null && m != null)
    return d === i;
  s.set(l, i), s.set(i, l);
  try {
    switch (o) {
      case lg: {
        if (l.size !== i.size)
          return !1;
        for (const [g, S] of l.entries())
          if (!i.has(g) || !qi(S, i.get(g), g, l, i, s, c))
            return !1;
        return !0;
      }
      case ag: {
        if (l.size !== i.size)
          return !1;
        const g = Array.from(l.values()), S = Array.from(i.values());
        for (let A = 0; A < g.length; A++) {
          const w = g[A], N = S.findIndex((_) => qi(w, _, void 0, l, i, s, c));
          if (N === -1)
            return !1;
          S.splice(N, 1);
        }
        return !0;
      }
      case ig:
      case ug:
      case cg:
      case fg:
      case og:
      case E1:
      case dg:
      case hg:
      case mg:
      case w1:
      case pg:
      case yg: {
        if (Tf(l) !== Tf(i) || l.length !== i.length)
          return !1;
        for (let g = 0; g < l.length; g++)
          if (!qi(l[g], i[g], g, l, i, s, c))
            return !1;
        return !0;
      }
      case rg:
        return l.byteLength !== i.byteLength ? !1 : Xi(new Uint8Array(l), new Uint8Array(i), s, c);
      case sg:
        return l.byteLength !== i.byteLength || l.byteOffset !== i.byteOffset ? !1 : Xi(new Uint8Array(l), new Uint8Array(i), s, c);
      case b1:
        return l.name === i.name && l.message === i.message;
      case vs: {
        if (!(Xi(l.constructor, i.constructor, s, c) || Sp(l) && Sp(i)))
          return !1;
        const S = [...Object.keys(l), ...Df(l)], A = [...Object.keys(i), ...Df(i)];
        if (S.length !== A.length)
          return !1;
        for (let w = 0; w < S.length; w++) {
          const N = S[w], _ = l[N];
          if (!Object.hasOwn(i, N))
            return !1;
          const B = i[N];
          if (!qi(_, B, N, l, i, s, c))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    s.delete(l), s.delete(i);
  }
}
function j1() {
}
function vg(l, i) {
  return q1(l, i, j1);
}
window.React.createElement;
window.React.isValidElement;
window.React.useEffect;
window.React.useMemo;
window.React.useState;
window.React.useSyncExternalStore;
window.ReactDOM.flushSync;
const H1 = window.React.createContext;
var B1 = H1(null);
B1.displayName = "InertiaHeadContext";
const _1 = window.React.createContext;
var Sg = _1(null);
Sg.displayName = "InertiaPageContext";
var C1 = Sg;
window.React.createElement;
window.React.StrictMode;
window.React.useEffect;
window.React.useMemo;
window.React.useRef;
window.React.useState;
const L1 = window.React.use;
function X1() {
  const l = L1(C1);
  if (!l)
    throw new Error("usePage must be used within the Inertia component");
  return l;
}
const bp = window.React, Y1 = window.React.createContext, Ep = window.React.createElement, Q1 = window.React.forwardRef;
window.React.use;
const of = window.React.useEffect, G1 = window.React.useImperativeHandle, wp = window.React.useMemo, Ap = window.React.useRef, Z1 = window.React.useState, df = window.React.useCallback, V1 = window.React.useMemo, hf = window.React.useRef, K1 = window.React.useState, P1 = window.React.useEffect, J1 = window.React.useLayoutEffect;
function F1(l, i) {
  typeof window > "u" ? P1(l, i) : J1(l, i);
}
const Xt = window.React.useCallback, Op = window.React.useEffect, dl = window.React.useRef, mn = window.React.useState;
function $1(l) {
  const { data: i, useDataState: s, useErrorsState: c } = l, o = typeof i == "function", p = () => o ? i() : i, d = Yt(p()), m = dl(!1), g = dl(l.precognitionEndpoint ?? null), [S, A] = mn(Yt(d)), [w, N] = s ? s() : mn(Yt(d)), [_, B] = c ? c() : mn({}), [Z, oe] = mn(!1), [C, ce] = mn(null), [me, fe] = mn(!1), [Be, K] = mn(!1), I = dl(void 0), ne = dl((Q) => Q), ue = dl(!1), V = dl(null), [j, H] = mn(!1), [Y, $] = mn([]), [be, b] = mn([]), x = dl(null), L = () => x.current ?? _s.get("form.withAllErrors"), P = dl(w);
  Op(() => {
    P.current = w;
  }), Op(() => (m.current = !0, () => {
    m.current = !1;
  }), []);
  const le = Xt(
    (Q, ge) => {
      N(typeof Q == "string" ? (W) => rs(Yt(W), Q, ge) : typeof Q == "function" ? (W) => Q(W) : Q);
    },
    [N]
  ), Ee = Xt(
    (Q, ge) => {
      if (o)
        throw new Error("You cannot call `defaults()` when using a function to define your form data.");
      ue.current = !0;
      let W = {};
      typeof Q > "u" ? (W = { ...P.current }, A(P.current)) : A((we) => (W = typeof Q == "string" ? rs(Yt(we), Q, ge) : Object.assign(Yt(we), Q), W)), V.current?.defaults(W);
    },
    [A]
  ), J = Xt(
    (...Q) => {
      const ge = o ? Yt(p()) : S, W = Yt(ge);
      Q.length === 0 ? (o && A(W), N(W)) : (o && A((we) => {
        const nt = Yt(we);
        return Q.filter((St) => vp(W, St)).forEach((St) => {
          rs(nt, St, Li(W, St));
        }), nt;
      }), N(
        (we) => Q.filter((nt) => vp(W, nt)).reduce(
          (nt, St) => rs(nt, St, Li(W, St)),
          { ...we }
        )
      )), V.current?.reset(...Q);
    },
    [N, S]
  ), ee = Xt(
    (Q, ge) => {
      B((W) => {
        const we = {
          ...W,
          ...typeof Q == "string" ? { [Q]: ge } : Q
        };
        return V.current?.setErrors(we), we;
      });
    },
    [B]
  ), ae = Xt(
    (...Q) => {
      B((ge) => {
        const W = Object.keys(ge).reduce(
          (we, nt) => ({
            ...we,
            ...Q.length > 0 && !Q.includes(nt) ? { [nt]: ge[nt] } : {}
          }),
          {}
        );
        return V.current && (Q.length === 0 ? V.current.setErrors({}) : Q.forEach(V.current.forgetError)), W;
      });
    },
    [B]
  ), qe = Xt(
    (...Q) => {
      J(...Q), ae(...Q);
    },
    [J, ae]
  ), Pe = Xt(() => {
    ae(), fe(!0), K(!0), I.current = window.setTimeout(() => {
      m.current && K(!1);
    }, _s.get("form.recentlySuccessfulDuration"));
  }, [ae, fe, K]), ht = Xt(() => {
    fe(!1), K(!1), clearTimeout(I.current);
  }, [fe, K]), Xe = Xt(() => {
    oe(!1), ce(null);
  }, [oe, ce]), Je = Xt((Q) => {
    ne.current = Q;
  }, []), _e = (Q, ge) => (ge(Q), Q), Le = Xt(
    (Q) => be.includes(Q),
    [be]
  ), rt = Xt((Q) => Q in _, [_]), Ut = Xt(
    (Q) => typeof Q == "string" ? Y.includes(Q) : Y.length > 0,
    [Y]
  ), Ne = {
    data: w,
    isDirty: !vg(w, S),
    errors: _,
    hasErrors: Object.keys(_).length > 0,
    processing: Z,
    progress: C,
    wasSuccessful: me,
    recentlySuccessful: Be,
    setData: le,
    transform: Je,
    setDefaults: Ee,
    reset: J,
    setError: ee,
    clearErrors: ae,
    resetAndClearErrors: qe
  }, te = (Q, ge) => {
    if (typeof Q == "object" && !("target" in Q) && (ge = Q, Q = void 0), Q === void 0)
      V.current.validate(ge);
    else {
      const W = _i(Q), we = ne.current(P.current);
      V.current.validate(W, Li(we, W), ge);
    }
    return Ne;
  }, ie = (...Q) => {
    if (g.current = qs.createWayfinderCallback(...Q), !V.current) {
      const W = ZS(
        (we) => {
          const { method: nt, url: St } = g.current(), Hl = P.current, st = ne.current(Hl);
          return we[nt](St, st);
        },
        Yt(S)
      );
      V.current = W, W.on("validatingChanged", () => {
        H(W.validating());
      }).on("validatedChanged", () => {
        b(W.valid());
      }).on("touchedChanged", () => {
        $(W.touched());
      }).on("errorsChanged", () => {
        const we = L() ? W.errors() : VS(W.errors());
        B(we), b(W.valid());
      });
    }
    const ge = Object.assign(Ne, {
      validating: j,
      validator: () => V.current,
      valid: Le,
      invalid: rt,
      touched: Ut,
      withoutFileValidation: () => _e(ge, () => V.current?.withoutFileValidation()),
      touch: (W, ...we) => (Array.isArray(W) ? V.current?.touch(W) : typeof W == "string" ? V.current?.touch([W, ...we]) : V.current?.touch(W), ge),
      withAllErrors: () => _e(ge, () => x.current = !0),
      setValidationTimeout: (W) => _e(ge, () => V.current?.setTimeout(W)),
      validateFiles: () => _e(ge, () => V.current?.validateFiles()),
      validate: te,
      setErrors: (W) => _e(ge, () => Ne.setError(W)),
      forgetError: (W) => _e(
        ge,
        () => Ne.clearErrors(_i(W))
      )
    });
    return ge;
  };
  return Ne.withPrecognition = ie, g.current && Ne.withPrecognition(g.current), {
    form: Ne,
    setDefaultsState: A,
    transformRef: ne,
    precognitionEndpointRef: g,
    dataRef: P,
    isMounted: m,
    setProcessing: oe,
    setProgress: ce,
    markAsSuccessful: Pe,
    clearErrors: ae,
    setError: ee,
    defaultsCalledInOnSuccessRef: ue,
    resetBeforeSubmit: ht,
    finishProcessing: Xe,
    withAllErrors: {
      enabled: L,
      enable: () => {
        x.current = !0;
      }
    }
  };
}
const W1 = window.React.useEffect, k1 = window.React.useState;
function Rp(l, i, s) {
  const [c, o] = k1(() => {
    const p = Ze.restore(i);
    return p !== void 0 ? p : l;
  });
  return W1(() => {
    const p = s?.current;
    if (p && p.length > 0 && typeof c == "object" && c !== null) {
      const d = { ...c };
      p.forEach((m) => delete d[m]), Ze.remember(d, i);
    } else
      Ze.remember(c, i);
  }, [c, i]), [c, o];
}
function I1(...l) {
  const { rememberKey: i, data: s, precognitionEndpoint: c } = qs.parseUseFormArguments(...l), o = Yt(typeof s == "function" ? s() : s), p = hf(null), d = hf([]), m = hf(null), g = i ? () => Rp(o, `${i}:data`, d) : void 0, S = i ? () => Rp({}, `${i}:errors`) : void 0, {
    form: A,
    setDefaultsState: w,
    transformRef: N,
    precognitionEndpointRef: _,
    dataRef: B,
    isMounted: Z,
    setProcessing: oe,
    setProgress: C,
    markAsSuccessful: ce,
    clearErrors: me,
    setError: fe,
    defaultsCalledInOnSuccessRef: Be,
    resetBeforeSubmit: K,
    finishProcessing: I
  } = $1({
    data: s,
    precognitionEndpoint: c,
    useDataState: g,
    useErrorsState: S
  }), [ne, ue] = K1(!1), V = A.setDefaults;
  A.setDefaults = df(
    (b, x) => (typeof b > "u" && ue(!0), V(b, x)),
    [V]
  ), F1(() => {
    ne && (A.isDirty && w(A.data), ue(!1));
  }, [ne]);
  const j = df(
    (...b) => {
      const { method: x, url: L, options: P } = qs.parseSubmitArguments(b, _.current);
      Be.current = !1;
      const le = {
        ...P,
        onCancelToken: (J) => (p.current = J, P.onCancelToken?.(J)),
        onBefore: (J) => (K(), P.onBefore?.(J)),
        onStart: (J) => (oe(!0), P.onStart?.(J)),
        onProgress: (J) => (C(J || null), P.onProgress?.(J)),
        onSuccess: async (J) => {
          Z.current && ce();
          const ee = P.onSuccess ? await P.onSuccess(J) : null;
          return Z.current && !Be.current && A.setData((ae) => (w(Yt(ae)), ae)), ee;
        },
        onError: (J) => (Z.current && (me(), fe(J)), P.onError?.(J)),
        onCancel: () => P.onCancel?.(),
        onFinish: (J) => (Z.current && I(), p.current = null, P.onFinish?.(J))
      };
      le.optimistic = le.optimistic ?? m.current ?? void 0, m.current = null;
      const Ee = N.current(B.current);
      x === "delete" ? Ze.delete(L, { ...le, data: Ee }) : Ze[x](L, Ee, le);
    },
    [me, fe, N]
  ), H = df(() => {
    p.current && p.current.cancel();
  }, []), Y = V1(
    () => ({
      get: (b, x = {}) => j("get", b, x),
      post: (b, x = {}) => j("post", b, x),
      put: (b, x = {}) => j("put", b, x),
      patch: (b, x = {}) => j("patch", b, x),
      delete: (b, x = {}) => j("delete", b, x)
    }),
    [j]
  );
  Object.assign(A, {
    submit: j,
    ...Y,
    cancel: H,
    dontRemember: (...b) => (d.current = b, $),
    optimistic: (b) => (m.current = b, $)
  });
  const $ = A, be = A.withPrecognition;
  return $.withPrecognition = (...b) => (be(...b), $), _.current, $;
}
var eE = (l) => {
  typeof bp.startTransition == "function" ? bp.startTransition(l) : setTimeout(l, 0);
}, Bn = () => {
}, tE = Y1(void 0), nE = Q1(
  ({
    action: l = "",
    method: i = "get",
    headers: s = {},
    queryStringArrayFormat: c = "brackets",
    errorBag: o = null,
    showProgress: p = !0,
    transform: d = (be) => be,
    optimistic: m,
    options: g = {},
    onStart: S = Bn,
    onProgress: A = Bn,
    onFinish: w = Bn,
    onBefore: N = Bn,
    onCancel: _ = Bn,
    onSuccess: B = Bn,
    onError: Z = Bn,
    onCancelToken: oe = Bn,
    onSubmitComplete: C = Bn,
    disableWhileProcessing: ce = !1,
    resetOnError: me = !1,
    resetOnSuccess: fe = !1,
    setDefaultsOnSuccess: Be = !1,
    invalidateCacheTags: K = [],
    validateFiles: I = !1,
    validationTimeout: ne = 1500,
    withAllErrors: ue = null,
    component: V = null,
    instant: j = !1,
    children: H,
    ...Y
  }, $) => {
    const be = () => {
      const [te, ie] = qe();
      return d(ie);
    }, b = I1({}).withPrecognition(
      () => L,
      () => qe()[0]
    ).setValidationTimeout(ne);
    I && b.validateFiles(), (ue ?? Yi.get("form.withAllErrors")) && b.withAllErrors(), b.transform(be);
    const x = Ap(void 0), L = wp(() => un(l) ? l.method : i.toLowerCase(), [l, i]), P = wp(() => V || (j && un(l) ? xy(l) : null), [V, j, l]), [le, Ee] = Z1(!1), J = Ap(new FormData()), ee = (te) => new FormData(x.current, te), ae = (te) => fp(ee(te)), qe = (te) => Ls(
      L,
      un(l) ? l.url : l,
      ae(te),
      c
    ), Pe = (te) => {
      te.type === "reset" && te.detail?.[Py] && te.preventDefault(), eE(
        () => Ee(te.type === "reset" ? !1 : !vg(ae(), fp(J.current)))
      );
    }, ht = (...te) => (b.clearErrors(...te), b);
    of(() => {
      J.current = ee(), b.setDefaults(ae());
      const te = ["input", "change", "reset"];
      return te.forEach((ie) => x.current.addEventListener(ie, Pe)), () => {
        te.forEach((ie) => x.current?.removeEventListener(ie, Pe));
      };
    }, []), of(() => {
      b.setValidationTimeout(ne);
    }, [ne]), of(() => {
      I ? b.validateFiles() : b.withoutFileValidation();
    }, [I]);
    const Xe = (...te) => {
      x.current && d1(x.current, J.current, te), b.reset(...te);
    }, Je = (...te) => {
      ht(...te), Xe(...te);
    }, _e = (te) => {
      te && (te === !0 ? Xe() : te.length > 0 && Xe(...te));
    }, Le = (te) => {
      const [ie, Q] = qe(te);
      if (te?.getAttribute("formtarget") === "_blank" && L === "get") {
        window.open(ie, "_blank");
        return;
      }
      const W = {
        headers: s,
        queryStringArrayFormat: c,
        errorBag: o,
        showProgress: p,
        invalidateCacheTags: K,
        component: P,
        optimistic: m ? (we) => m(we, Q) : void 0,
        onCancelToken: oe,
        onBefore: N,
        onStart: S,
        onProgress: A,
        onFinish: w,
        onCancel: _,
        onSuccess: (...we) => {
          B(...we), C({
            reset: Xe,
            defaults: rt
          }), _e(fe), Be === !0 && rt();
        },
        onError(...we) {
          Z(...we), _e(me);
        },
        ...g
      };
      b.transform(() => d(Q)), b.submit(L, ie, W), b.transform(be);
    }, rt = () => {
      J.current = ee(), Ee(!1);
    }, Ut = {
      errors: b.errors,
      hasErrors: b.hasErrors,
      processing: b.processing,
      progress: b.progress,
      wasSuccessful: b.wasSuccessful,
      recentlySuccessful: b.recentlySuccessful,
      isDirty: le,
      clearErrors: ht,
      resetAndClearErrors: Je,
      setError: b.setError,
      reset: Xe,
      submit: Le,
      defaults: rt,
      getData: ae,
      getFormData: ee,
      // Precognition
      validator: () => b.validator(),
      validating: b.validating,
      valid: b.valid,
      invalid: b.invalid,
      validate: (te, ie) => b.validate(...qs.mergeHeadersForValidation(te, ie, s)),
      touch: b.touch,
      touched: b.touched
    };
    G1($, () => Ut, [b, le, Le]);
    const Ne = Ep(
      "form",
      {
        ...Y,
        ref: x,
        action: un(l) ? l.url : l,
        method: L,
        onSubmit: (te) => {
          te.preventDefault(), Le(te.nativeEvent.submitter);
        },
        inert: ce && b.processing
      },
      typeof H == "function" ? H(Ut) : H
    );
    return Ep(tE.Provider, { value: Ut }, Ne);
  }
);
nE.displayName = "InertiaForm";
window.React.use;
window.React.useEffect;
window.React.useMemo;
const lE = window.React, ss = window.React.createElement, aE = window.React.forwardRef, us = window.React.useCallback, wa = window.React.useEffect, iE = window.React.useImperativeHandle, zi = window.React.useMemo, rE = window.React.useRef, It = window.React.useState;
var mf = (l, i) => l ? l && typeof l == "object" && "current" in l ? l.current : typeof l == "string" ? document.querySelector(l) : i : i, cs = (l, i, s = null) => l ? typeof l == "function" ? l(i) : l : s, sE = aE(
  ({
    data: l,
    buffer: i = 0,
    as: s = "div",
    manual: c = !1,
    manualAfter: o = 0,
    preserveUrl: p = !1,
    reverse: d = !1,
    autoScroll: m,
    children: g,
    startElement: S,
    endElement: A,
    itemsElement: w,
    previous: N,
    next: _,
    loading: B,
    params: Z = {},
    onlyNext: oe = !1,
    onlyPrevious: C = !1,
    ...ce
  }, me) => {
    const [fe, Be] = It(null), K = us((Fe) => Be(Fe), []), [I, ne] = It(null), ue = us((Fe) => ne(Fe), []), [V, j] = It(null), H = us((Fe) => j(Fe), []), Y = X1().scrollProps?.[l], [$, be] = It(!1), [b, x] = It(!1), [L, P] = It(0), [le, Ee] = It(!!Y?.previousPage), [J, ee] = It(!!Y?.nextPage), [ae, qe] = It(null), [Pe, ht] = It(null), [Xe, Je] = It(null);
    wa(() => {
      const Fe = S ? mf(S, fe) : fe;
      qe(Fe);
    }, [S, fe]), wa(() => {
      const Fe = A ? mf(A, I) : I;
      ht(Fe);
    }, [A, I]), wa(() => {
      const Fe = w ? mf(w, V) : V;
      Je(Fe);
    }, [w, V]);
    const _e = zi(() => hb(Xe), [Xe]), Le = rE({
      buffer: i,
      onlyNext: oe,
      onlyPrevious: C,
      reverse: d,
      preserveUrl: p,
      params: Z
    });
    Le.current = {
      buffer: i,
      onlyNext: oe,
      onlyPrevious: C,
      reverse: d,
      preserveUrl: p,
      params: Z
    };
    const [rt, Ut] = It(null), Ne = zi(() => rt?.dataManager, [rt]), te = zi(() => rt?.elementManager, [rt]), ie = us(() => {
      _e ? _e.scrollTo({
        top: _e.scrollHeight,
        behavior: "instant"
      }) : window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "instant"
      });
    }, [_e]);
    wa(() => {
      if (!Xe)
        return;
      function Fe() {
        P(gn.dataManager.getRequestCount()), Ee(gn.dataManager.hasPrevious()), ee(gn.dataManager.hasNext());
      }
      const gn = Ib({
        // Data
        getPropName: () => l,
        inReverseMode: () => Le.current.reverse,
        shouldFetchNext: () => !Le.current.onlyPrevious,
        shouldFetchPrevious: () => !Le.current.onlyNext,
        shouldPreserveUrl: () => Le.current.preserveUrl,
        getReloadOptions: () => Le.current.params,
        // Elements
        getTriggerMargin: () => Le.current.buffer,
        getStartElement: () => ae,
        getEndElement: () => Pe,
        getItemsElement: () => Xe,
        getScrollableParent: () => _e,
        // Callbacks
        onBeforePreviousRequest: () => be(!0),
        onBeforeNextRequest: () => x(!0),
        onCompletePreviousRequest: () => {
          be(!1), Fe();
        },
        onCompleteNextRequest: () => {
          x(!1), Fe();
        },
        onDataReset: Fe
      });
      Ut(gn);
      const { dataManager: Bl, elementManager: Ma } = gn;
      return Fe(), Ma.setupObservers(), Ma.processServerLoadedElements(Bl.getLastLoadedPage()), ge && Ma.enableTriggers(), () => {
        gn.flush(), Ut(null);
      };
    }, [l, Xe, ae, Pe, _e]);
    const Q = zi(
      () => c || o > 0 && L >= o,
      [c, o, L]
    ), ge = zi(() => !Q, [Q]);
    wa(() => {
      ge ? te?.enableTriggers() : te?.disableTriggers();
    }, [ge, oe, C, ae, Pe]), wa(() => {
      (m !== void 0 ? m : d) && ie();
    }, [_e]), iE(
      me,
      () => ({
        fetchNext: Ne?.fetchNext || (() => {
        }),
        fetchPrevious: Ne?.fetchPrevious || (() => {
        }),
        hasPrevious: Ne?.hasPrevious || (() => !1),
        hasNext: Ne?.hasNext || (() => !1)
      }),
      [Ne]
    );
    const W = ge && !oe, we = ge && !C, nt = {
      loadingPrevious: $,
      loadingNext: b,
      hasPrevious: le,
      hasNext: J
    }, St = {
      loading: $,
      fetch: Ne?.fetchPrevious ?? (() => {
      }),
      autoMode: W,
      manualMode: !W,
      hasMore: le,
      ...nt
    }, Hl = {
      loading: b,
      fetch: Ne?.fetchNext ?? (() => {
      }),
      autoMode: we,
      manualMode: !we,
      hasMore: J,
      ...nt
    }, st = {
      loading: $ || b,
      loadingPrevious: $,
      loadingNext: b
    }, ml = [];
    return S || ml.push(
      ss(
        "div",
        { ref: K },
        // Render previous slot or fallback to loading indicator
        cs(N, St, $ ? cs(B, St) : null)
      )
    ), ml.push(
      ss(
        s,
        { ...ce, ref: H },
        typeof g == "function" ? g(st) : g
      )
    ), A || ml.push(
      ss(
        "div",
        { ref: ue },
        // Render next slot or fallback to loading indicator
        cs(_, Hl, b ? cs(B, Hl) : null)
      )
    ), ss(lE.Fragment, {}, ...d ? [...ml].reverse() : ml);
  }
);
sE.displayName = "InertiaInfiniteScroll";
const uE = window.React.createElement, cE = window.React.forwardRef, zp = window.React.useEffect, en = window.React.useMemo, fE = window.React.useRef, oE = window.React.useState;
var rn = () => {
}, dE = cE(
  ({
    children: l,
    as: i = "a",
    data: s = {},
    href: c = "",
    method: o = "get",
    preserveScroll: p = !1,
    preserveState: d = null,
    preserveUrl: m = !1,
    replace: g = !1,
    only: S = [],
    except: A = [],
    headers: w = {},
    queryStringArrayFormat: N = "brackets",
    async: _ = !1,
    onClick: B = rn,
    onCancelToken: Z = rn,
    onBefore: oe = rn,
    onStart: C = rn,
    onProgress: ce = rn,
    onFinish: me = rn,
    onCancel: fe = rn,
    onSuccess: Be = rn,
    onError: K = rn,
    onPrefetching: I = rn,
    onPrefetched: ne = rn,
    prefetch: ue = !1,
    cacheFor: V = 0,
    cacheTags: j = [],
    viewTransition: H = !1,
    component: Y = null,
    instant: $ = !1,
    pageProps: be = null,
    ...b
  }, x) => {
    const [L, P] = oE(0), le = fE(void 0), Ee = en(() => un(c) ? c.method : o.toLowerCase(), [c, o]), J = en(() => Y || ($ && un(c) ? xy(c) : null), [Y, $, c]), ee = en(() => typeof i != "string" || i.toLowerCase() !== "a" ? i : Ee !== "get" ? "button" : i.toLowerCase(), [i, Ee]), ae = en(
      () => Ls(Ee, un(c) ? c.url : c, s, N),
      [c, Ee, s, N]
    ), qe = en(() => ae[0], [ae]), Pe = en(() => ae[1], [ae]), ht = en(
      () => ({
        data: Pe,
        method: Ee,
        preserveScroll: p,
        preserveState: d ?? Ee !== "get",
        preserveUrl: m,
        replace: g,
        only: S,
        except: A,
        headers: w,
        async: _,
        component: J,
        pageProps: be
      }),
      [
        Pe,
        Ee,
        p,
        d,
        m,
        g,
        S,
        A,
        w,
        _,
        J,
        be
      ]
    ), Xe = en(
      () => ({
        ...ht,
        viewTransition: H,
        onCancelToken: Z,
        onBefore: oe,
        onStart(ie) {
          P((Q) => Q + 1), C(ie);
        },
        onProgress: ce,
        onFinish(ie) {
          P((Q) => Q - 1), me(ie);
        },
        onCancel: fe,
        onSuccess: Be,
        onError: K
      }),
      [
        ht,
        H,
        Z,
        oe,
        C,
        ce,
        me,
        fe,
        Be,
        K
      ]
    ), Je = en(
      () => ue === !0 ? ["hover"] : ue === !1 ? [] : Array.isArray(ue) ? ue : [ue],
      Array.isArray(ue) ? ue : [ue]
    ), _e = en(() => V !== 0 ? V : Je.length === 1 && Je[0] === "click" ? 0 : _s.get("prefetch.cacheFor"), [V, Je]), Le = en(() => () => {
      Ze.prefetch(
        qe,
        {
          ...ht,
          onPrefetching: I,
          onPrefetched: ne
        },
        { cacheFor: _e, cacheTags: j }
      );
    }, [qe, ht, I, ne, _e, j]);
    zp(() => () => {
      clearTimeout(le.current);
    }, []), zp(() => {
      Je.includes("mount") && setTimeout(() => Le());
    }, Je);
    const rt = {
      onClick: (ie) => {
        B(ie), is(ie) && (ie.preventDefault(), Ze.visit(qe, Xe));
      }
    }, Ut = {
      onMouseEnter: () => {
        le.current = window.setTimeout(() => {
          Le();
        }, _s.get("prefetch.hoverDelay"));
      },
      onMouseLeave: () => {
        clearTimeout(le.current);
      },
      onClick: rt.onClick
    }, Ne = {
      onMouseDown: (ie) => {
        is(ie) && (ie.preventDefault(), Le());
      },
      onKeyDown: (ie) => {
        op(ie) && (ie.preventDefault(), Le());
      },
      onMouseUp: (ie) => {
        is(ie) && (ie.preventDefault(), Ze.visit(qe, Xe));
      },
      onKeyUp: (ie) => {
        op(ie) && (ie.preventDefault(), Ze.visit(qe, Xe));
      },
      onClick: (ie) => {
        B(ie), is(ie) && ie.preventDefault();
      }
    }, te = en(() => ee === "button" ? { type: "button" } : ee === "a" || typeof ee != "string" ? { href: qe } : {}, [ee, qe]);
    return uE(
      ee,
      {
        ...b,
        ...te,
        ref: x,
        ...Je.includes("hover") ? Ut : Je.includes("click") ? Ne : rt,
        "data-loading": L > 0 ? "" : void 0
      },
      l
    );
  }
);
dE.displayName = "InertiaLink";
window.React.useCallback;
window.React.useMemo;
window.React.useRef;
window.React.useState;
window.React.useEffect;
window.React.useRef;
window.React.useEffect;
window.React.useState;
window.React.createElement;
window.React.useCallback;
window.React.useEffect;
window.React.useMemo;
window.React.useRef;
window.React.useState;
var _s = Yi.extend();
const bg = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0"
}, Eg = (l) => ({
  ...l ?? {},
  _ts: Date.now()
}), hE = (l) => {
  if (l === "")
    return "";
  try {
    return JSON.parse(l);
  } catch {
    return l;
  }
}, mE = (l) => {
  const i = {};
  return l.forEach((s, c) => {
    i[c.toLowerCase()] = s;
  }), i;
}, pE = (l) => {
  if (typeof document > "u")
    return;
  const i = document.cookie.split("; ").find((s) => s.startsWith(`${encodeURIComponent(l)}=`));
  return i ? decodeURIComponent(i.split("=").slice(1).join("=")) : void 0;
}, yE = (l, i) => {
  const s = new URL(l, window.location.origin);
  return Object.entries(Eg(i)).forEach(([c, o]) => {
    if (o != null) {
      if (Array.isArray(o)) {
        o.forEach((p) => s.searchParams.append(c, String(p)));
        return;
      }
      s.searchParams.set(c, String(o));
    }
  }), `${s.pathname}${s.search}${s.hash}`;
}, gE = async (l, i, s, c) => {
  const o = pE("XSRF-TOKEN"), p = new Headers(bg);
  p.set("X-Requested-With", "XMLHttpRequest"), o && p.set("x-xsrf-token", o), Object.entries(c?.headers ?? {}).forEach(([w, N]) => {
    N != null && p.set(w, String(N));
  });
  let d;
  s instanceof FormData ? d = s : s != null && (d = typeof s == "string" ? s : JSON.stringify(s), p.has("Content-Type") || p.set("Content-Type", "application/json"));
  const m = await fetch(yE(i, c?.params), {
    method: l.toUpperCase(),
    body: d,
    headers: p,
    credentials: "same-origin",
    signal: c?.signal
  }), g = mE(m.headers);
  let S;
  switch (c?.responseType) {
    case "arraybuffer":
      S = await m.arrayBuffer();
      break;
    case "document": {
      const w = await m.text(), N = new DOMParser(), _ = g["content-type"]?.includes("xml") ? "application/xml" : "text/html";
      S = N.parseFromString(w, _);
      break;
    }
    default:
      S = await m.blob();
      break;
  }
  const A = {
    data: S,
    status: m.status,
    headers: g
  };
  if (!m.ok) {
    const w = new Error(`Request failed with status ${m.status}`);
    throw w.response = A, w;
  }
  return A;
}, Di = async (l, i, s, c) => {
  if (c?.responseType && c.responseType !== "json" && c.responseType !== "text")
    return gE(l, i, s, c);
  const o = await Hy.getClient().request({
    method: l,
    url: i,
    data: s,
    params: Eg(c?.params),
    headers: {
      ...bg,
      ...c?.headers ?? {}
    },
    signal: c?.signal
  });
  return {
    data: hE(o.data),
    status: o.status,
    headers: o.headers
  };
}, Mi = {
  get: (l, i) => Di("get", l, void 0, i),
  post: (l, i, s) => Di("post", l, i, s),
  put: (l, i, s) => Di("put", l, i, s),
  patch: (l, i, s) => Di("patch", l, i, s),
  delete: (l, i, s) => Di("delete", l, i, s)
}, Ti = (l) => {
  if (typeof l == "object" && l !== null && "isAxiosError" in l)
    return l;
  const i = l instanceof Error ? l.message : "Request failed", s = new Error(i);
  s.isAxiosError = !0;
  const c = l.response;
  return c && (s.response = c), s;
}, vE = {
  async get(l, i) {
    try {
      return await Mi.get(l, i);
    } catch (s) {
      throw Ti(s);
    }
  },
  async post(l, i, s) {
    try {
      return await Mi.post(l, i, s);
    } catch (c) {
      throw Ti(c);
    }
  },
  async put(l, i, s) {
    try {
      return await Mi.put(l, i, s);
    } catch (c) {
      throw Ti(c);
    }
  },
  async patch(l, i, s) {
    try {
      return await Mi.patch(l, i, s);
    } catch (c) {
      throw Ti(c);
    }
  },
  async delete(l, i) {
    try {
      return await Mi.delete(l, i?.data, i);
    } catch (s) {
      throw Ti(s);
    }
  },
  isAxiosError(l) {
    return !!(l && typeof l == "object" && "isAxiosError" in l);
  }
}, fs = window.React.useState, SE = window.UIComponents.Button, bE = window.UIComponents.Select, EE = window.UIComponents.SelectContent, Dp = window.UIComponents.SelectItem, wE = window.UIComponents.SelectTrigger, AE = window.UIComponents.SelectValue, OE = window.UIComponents.Textarea, pf = window.UIComponents.Label, RE = window.UIComponents.Checkbox, zE = window.UIComponents.Toaster, Mp = window.sonner.toast, DE = window.LucideReact;
function NE({ data: l }) {
  const [i, s] = fs(""), [c, o] = fs(""), [p, d] = fs(!1), [m, g] = fs(!1), S = async (A) => {
    A.preventDefault(), d(!0);
    try {
      const w = {
        message: c,
        ...m ? { sendToAll: !0 } : { userId: i }
      }, N = await vE.post("", w);
      console.log(N.data), Mp.success("Сообщение успешно отправлено!");
    } catch (w) {
      console.error(w), Mp.error("Ошибка при отправке сообщения.");
    } finally {
      d(!1);
    }
  };
  return /* @__PURE__ */ Ge.jsxs(Ge.Fragment, { children: [
    /* @__PURE__ */ Ge.jsx(zE, { position: "top-center", richColors: !0, closeButton: !0 }),
    /* @__PURE__ */ Ge.jsx("div", { className: "grid gap-4", children: /* @__PURE__ */ Ge.jsxs("form", { onSubmit: S, className: "flex flex-col gap-4 max-w-[400px]", children: [
      /* @__PURE__ */ Ge.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ Ge.jsx(
          RE,
          {
            id: "send-to-all",
            checked: m,
            onCheckedChange: (A) => {
              g(A), A && s("");
            }
          }
        ),
        /* @__PURE__ */ Ge.jsx(pf, { htmlFor: "send-to-all", children: "Всем пользователям" })
      ] }),
      /* @__PURE__ */ Ge.jsxs("div", { children: [
        /* @__PURE__ */ Ge.jsx(pf, { htmlFor: "user-select", className: "block mb-2 font-medium", children: "Выберите пользователя:" }),
        /* @__PURE__ */ Ge.jsxs(
          bE,
          {
            onValueChange: (A) => s(A),
            value: i,
            disabled: m,
            children: [
              /* @__PURE__ */ Ge.jsx(wE, { id: "user-select", className: "w-full", children: /* @__PURE__ */ Ge.jsx(AE, { placeholder: "-- Выберите --" }) }),
              /* @__PURE__ */ Ge.jsx(EE, { children: l?.users?.length > 0 ? l.users.map((A) => /* @__PURE__ */ Ge.jsx(Dp, { value: A.id.toString(), children: A.fullName }, A.id)) : /* @__PURE__ */ Ge.jsx(Dp, { value: "", disabled: !0, children: "Пользователей нет" }) })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ Ge.jsxs("div", { children: [
        /* @__PURE__ */ Ge.jsx(pf, { htmlFor: "message-input", className: "block mb-2 font-medium", children: "Сообщение:" }),
        /* @__PURE__ */ Ge.jsx(
          OE,
          {
            id: "message-input",
            value: c,
            onChange: (A) => o(A.target.value),
            placeholder: "Введите сообщение..."
          }
        )
      ] }),
      /* @__PURE__ */ Ge.jsxs("div", { className: "flex gap-2 items-center", children: [
        /* @__PURE__ */ Ge.jsx(
          SE,
          {
            type: "submit",
            className: "w-fit",
            disabled: p || !m && !i || !c.trim(),
            children: p ? "Отправка..." : "Отправить"
          }
        ),
        p && /* @__PURE__ */ Ge.jsx(DE.Loader2, { className: "w-6 h-6 animate-spin" })
      ] })
    ] }) })
  ] });
}
export {
  NE as default
};
