import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ClockCounterClockwise,
  Keyboard,
  X,
  Vibrate,
} from "@phosphor-icons/react";
import { toast, Toaster } from "sonner";
import CalculatorDisplay from "@/components/CalculatorDisplay";
import CalculatorKeypad from "@/components/CalculatorKeypad";
import CalculatorHistory from "@/components/CalculatorHistory";
import {
  evaluate,
  formatNumber,
  openParenCount,
  roundValue,
} from "@/utils/calculatorEngine";
import type { HistoryItem } from "@/types/calculator";

const HISTORY_KEY = "dti.calc.history.v1";
const MAX_HISTORY = 60;

const OP_GLYPH: Record<string, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
  power: "^",
};

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function toggleSign(expr: string): string {
  const m = /(\d+\.?\d*)$/.exec(expr);
  if (!m) return expr;
  const num = m[1];
  const start = expr.length - num.length;
  const before = expr.slice(0, start);
  if (before.endsWith("−") && !before.endsWith("--")) {
    // remove the leading minus (and a wrapping pair if present)
    return before.slice(0, -1) + num;
  }
  return before + "−" + num;
}

export default function App() {
  const reduce = useReducedMotion();
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());
  const [flashId, setFlashId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [history]);

  const buzz = useCallback(() => {
    if (haptics && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        /* ignore */
      }
    }
  }, [haptics]);

  const flash = useCallback((id: string) => {
    setFlashId(id);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashId(null), 260);
  }, []);

  const preview = useMemo(() => {
    if (!expression.trim()) return null;
    const r = evaluate(expression);
    return r.ok && typeof r.value === "number" ? formatNumber(r.value) : null;
  }, [expression]);

  const bigValue = committed
    ? result ?? "0"
    : preview ?? (expression.replace(/−/g, "-") || "0");

  const pushHistory = useCallback((formula: string, value: string) => {
    setHistory((prev) => {
      const item: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        formula,
        result: value,
        ts: Date.now(),
      };
      return [item, ...prev].slice(0, MAX_HISTORY);
    });
  }, []);

  const equals = useCallback(() => {
    const r = evaluate(expression);
    if (r.ok && typeof r.value === "number") {
      const value = formatNumber(roundValue(r.value));
      setResult(value);
      setCommitted(true);
      setError(null);
      pushHistory(expression.replace(/−/g, "-"), value);
    } else {
      setError(r.error ?? "Invalid expression");
      setCommitted(false);
    }
  }, [expression, pushHistory]);

  const handleKey = useCallback(
    (id: string) => {
      buzz();
      flash(id);

      // start a fresh entry after a committed result
      let expr = expression;
      if (committed) {
        if (["add", "subtract", "multiply", "divide", "power", "percent"].includes(id)) {
          expr = result ?? "0";
        } else if (id !== "C") {
          expr = "";
        }
        setCommitted(false);
      }

      switch (id) {
        case "C":
          setExpression("");
          setResult(null);
          setError(null);
          setCommitted(false);
          return;
        case "back":
          setExpression(expr.replace(/.$/, ""));
          setError(null);
          return;
        case "equals":
          equals();
          return;
        case "sign":
          setExpression(toggleSign(expr));
          return;
        case "percent":
          if (/[0-9)]$/.test(expr)) setExpression(expr + "%");
          return;
        case "decimal": {
          const tail = /(\d*\.?\d*)$/.exec(expr)?.[1] ?? "";
          if (tail.includes(".")) return;
          setExpression(expr + (tail === "" ? "0." : "."));
          setError(null);
          return;
        }
        case "lparen":
          setExpression(expr + "(");
          setError(null);
          return;
        case "rparen": {
          if (openParenCount(expr) > 0 && /[0-9)%]$/.test(expr)) {
            setExpression(expr + ")");
            setError(null);
          }
          return;
        }
        case "power":
          if (/[0-9)]$/.test(expr)) {
            setExpression(expr + "^");
            setError(null);
          }
          return;
        default: {
          if (OP_GLYPH[id]) {
            const op = OP_GLYPH[id];
            // replace a trailing operator
            if (/[+\-−×÷^%]$/.test(expr)) {
              setExpression(expr.replace(/[+\-−×÷^%]$/, op));
            } else if (/[0-9)]$/.test(expr) || expr === "") {
              if (expr === "" && op === "−") {
                setExpression("−");
              } else {
                setExpression(expr + op);
              }
            }
            setError(null);
            return;
          }
          if (/^[0-9]$/.test(id)) {
            setExpression(expr + id);
            setError(null);
          }
        }
      }
    },
    [expression, committed, result, equals, buzz, flash]
  );

  // physical keyboard bindings
  useEffect(() => {
    const map: Record<string, string> = {
      "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
      "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
      ".": "decimal", ",": "decimal",
      "+": "add", "-": "subtract", "*": "multiply", "x": "multiply", "X": "multiply",
      "/": "divide", "^": "power", "%": "percent",
      "(": "lparen", ")": "rparen",
      "Enter": "equals", "=": "equals",
      "Backspace": "back", "Delete": "C", "c": "C", "C": "C",
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const id = map[e.key];
      if (id) {
        e.preventDefault();
        handleKey(id);
      } else if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowHistory(false);
      }
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [handleKey]);

  const copyResult = useCallback((text: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => toast.success(`Copied ${text}`))
        .catch(() => toast.error("Could not copy to clipboard"));
    } else {
      toast.error("Clipboard unavailable");
    }
  }, []);

  const recall = useCallback((item: HistoryItem) => {
    setExpression(item.result.replace(/−/g, "-"));
    setResult(null);
    setError(null);
    setCommitted(false);
    setShowHistory(false);
    toast.success("Recalled to display");
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#090D16] px-4 py-6 text-slate-100">
      <Toaster theme="dark" position="top-center" />

      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl ${
            reduce ? "" : "animate-pulse"
          }`}
        />
        <div className="absolute bottom-0 right-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-10 left-4 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <motion.main
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* top controls */}
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
              Calc
            </span>
            <span className="hidden text-xs text-slate-600 sm:inline">precision engine</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHaptics((v) => !v)}
              aria-pressed={haptics}
              aria-label="Toggle haptic feedback"
              className={`rounded-xl border p-2.5 transition-colors active:scale-95 ${
                haptics
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                  : "border-white/5 bg-[#131B2E] text-slate-500 hover:text-slate-300"
              }`}
            >
              <Vibrate size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              aria-label="Keyboard shortcuts"
              className="rounded-xl border border-white/5 bg-[#131B2E] p-2.5 text-slate-500 transition-colors hover:text-slate-300 active:scale-95"
            >
              <Keyboard size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              aria-label="Open history"
              className="relative rounded-xl border border-white/5 bg-[#131B2E] p-2.5 text-slate-500 transition-colors hover:text-slate-300 active:scale-95"
            >
              <ClockCounterClockwise size={18} weight="bold" />
              {history.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#0B0F17]">
                  {history.length > 9 ? "9+" : history.length}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="mb-4">
          <CalculatorDisplay
            expression={expression}
            bigValue={bigValue}
            isPreview={!committed && !!preview}
            error={error}
            committed={committed}
            onCopy={copyResult}
          />
        </div>

        {/* live region for screen readers */}
        <div aria-live="polite" className="sr-only">
          {error ? `Error: ${error}` : committed ? `Result ${result}` : expression}
        </div>

        <CalculatorKeypad
          onKey={handleKey}
          flashId={flashId}
          canCloseParen={openParenCount(expression) > 0}
        />

        <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-slate-600">
          Order of operations · live preview · keyboard ready
        </p>
      </motion.main>

      <CalculatorHistory
        open={showHistory}
        items={history}
        onClose={() => setShowHistory(false)}
        onRecall={recall}
        onCopy={copyResult}
        onClear={() => {
          setHistory([]);
          toast.success("History cleared");
        }}
      />

      {/* shortcuts dialog */}
      <AnimatePresence>
        {showShortcuts && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShortcuts(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-label="Keyboard shortcuts"
              initial={reduce ? false : { opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0F1524] p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-slate-300">
                  Shortcuts
                </h2>
                <button
                  type="button"
                  onClick={() => setShowShortcuts(false)}
                  aria-label="Close"
                  className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200 active:scale-95"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {[
                  ["0-9", "Digits"],
                  [".", "Decimal"],
                  ["+ − * /", "Operators"],
                  ["^", "Power"],
                  ["( )", "Parentheses"],
                  ["%", "Percent"],
                  ["Enter / =", "Evaluate"],
                  ["Backspace", "Delete"],
                  ["Esc / C", "Clear all"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2 border-b border-white/5 py-1">
                    <dt className="font-mono text-amber-300">{k}</dt>
                    <dd className="text-slate-500">{v}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}