// Expression tokenizer + recursive-descent evaluator with standard operator
// precedence (BODMAS / PEMDAS), parentheses, percent, power and unary sign.
import type { EvalResult, Seg } from "@/types/calculator";

class CalcError extends Error {}

type Tok =
  | { t: "num"; v: number }
  | { t: "op"; v: string }
  | { t: "lparen" }
  | { t: "rparen" };

function tokenize(input: string): Tok[] {
  // Normalize display glyphs to canonical operators.
  const src = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "	") {
      i++;
      continue;
    }
    if ((c >= "0" && c <= "9") || c === ".") {
      let num = "";
      let dots = 0;
      while (i < src.length && ((src[i] >= "0" && src[i] <= "9") || src[i] === ".")) {
        if (src[i] === ".") dots++;
        num += src[i];
        i++;
      }
      if (dots > 1) throw new CalcError("Malformed number");
      toks.push({ t: "num", v: parseFloat(num) });
      continue;
    }
    if ("+-*/^%".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: "rparen" });
      i++;
      continue;
    }
    throw new CalcError("Unexpected character");
  }
  return toks;
}

function parse(toks: Tok[]): number {
  let pos = 0;
  const peek = (): Tok | undefined => toks[pos];
  const next = (): Tok => toks[pos++];

  function parseExpr(): number {
    let left = parseTerm();
    const tk = peek();
    while (tk && tk.t === "op" && (tk.v === "+" || tk.v === "-")) {
      const op = (next() as { t: "op"; v: string }).v;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    let tk = peek();
    while (tk && tk.t === "op" && (tk.v === "*" || tk.v === "/")) {
      const op = (next() as { t: "op"; v: string }).v;
      const right = parseFactor();
      if (op === "/") {
        if (right === 0) throw new CalcError("Cannot divide by zero");
        left = left / right;
      } else {
        left = left * right;
      }
      tk = peek();
    }
    return left;
  }

  function parseFactor(): number {
    const base = parseUnary();
    const tk = peek();
    if (tk && tk.t === "op" && tk.v === "^") {
      next();
      const exp = parseFactor(); // right associative
      const r = Math.pow(base, exp);
      if (Number.isNaN(r)) throw new CalcError("Math domain error");
      return r;
    }
    return base;
  }

  function parseUnary(): number {
    const tk = peek();
    if (tk && tk.t === "op" && (tk.v === "-" || tk.v === "+")) {
      const op = (next() as { t: "op"; v: string }).v;
      const v = parseUnary();
      return op === "-" ? -v : v;
    }
    return parsePostfix();
  }

  function parsePostfix(): number {
    let v = parsePrimary();
    let tk = peek();
    while (tk && tk.t === "op" && tk.v === "%") {
      next();
      v = v / 100;
      tk = peek();
    }
    return v;
  }

  function parsePrimary(): number {
    const tk = peek();
    if (!tk) throw new CalcError("Unexpected end of expression");
    if (tk.t === "num") {
      next();
      return tk.v;
    }
    if (tk.t === "lparen") {
      next();
      const v = parseExpr();
      const close = peek();
      if (!close || close.t !== "rparen") throw new CalcError("Unmatched parentheses");
      next();
      return v;
    }
    throw new CalcError("Unexpected token");
  }

  if (toks.length === 0) throw new CalcError("Nothing to calculate");
  const result = parseExpr();
  if (pos < toks.length) throw new CalcError("Invalid expression");
  return result;
}

/** Round away floating point artifacts (0.1 + 0.2 -> 0.3). */
export function roundValue(n: number): number {
  if (!isFinite(n)) return n;
  const r = parseFloat(n.toPrecision(12));
  return Object.is(r, -0) ? 0 : r;
}

export function evaluate(expression: string): EvalResult {
  try {
    if (!expression.trim()) return { ok: false, error: "Nothing to calculate" };
    const toks = tokenize(expression);
    const raw = parse(toks);
    if (Number.isNaN(raw)) return { ok: false, error: "Math error" };
    if (!isFinite(raw)) return { ok: false, error: "Result too large" };
    return { ok: true, value: roundValue(raw) };
  } catch (e) {
    if (e instanceof CalcError) return { ok: false, error: e.message };
    return { ok: false, error: "Invalid expression" };
  }
}

/** Format a number for display with grouping + exponential fallback. */
export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return "NaN";
  if (!isFinite(n)) return n > 0 ? "∞" : "-∞";
  if (Object.is(n, -0)) n = 0;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
    return n
      .toExponential(6)
      .replace(/(\.\d*?)0+e/, "$1e")
      .replace(/\.e/, "e")
      .replace("e+", "e");
  }
  const fixed = n.toFixed(10);
  let [intPart, decPart = ""] = fixed.split(".");
  decPart = decPart.replace(/0+$/, "");
  const intFmt = Number(intPart).toLocaleString("en-US");
  return decPart ? `${intFmt}.${decPart}` : intFmt;
}

/** Net open parentheses (used to enable the ")" key). */
export function openParenCount(expr: string): number {
  let o = 0;
  let c = 0;
  for (const ch of expr) {
    if (ch === "(") o++;
    else if (ch === ")") c++;
  }
  return o - c;
}

/** Split an expression into colored segments for syntax highlighting. */
export function highlight(expression: string): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  const s = expression;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      out.push({ text: s.slice(i, j), kind: "num" });
      i = j;
    } else if (/[+\-−×÷^*/]/.test(c)) {
      out.push({ text: c, kind: "op" });
      i++;
    } else if (c === "%") {
      out.push({ text: c, kind: "pct" });
      i++;
    } else if (c === "(" || c === ")") {
      out.push({ text: c, kind: "paren" });
      i++;
    } else {
      out.push({ text: c, kind: "other" });
      i++;
    }
  }
  return out;
}
