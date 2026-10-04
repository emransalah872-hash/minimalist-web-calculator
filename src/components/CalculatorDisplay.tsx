import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Copy, Check } from "@phosphor-icons/react";
import { highlight } from "@/utils/calculatorEngine";
import type { SegKind } from "@/types/calculator";

interface Props {
  expression: string;
  bigValue: string;
  isPreview: boolean;
  error: string | null;
  committed: boolean;
  onCopy: (text: string) => void;
}

const segColor: Record<SegKind, string> = {
  num: "text-slate-100",
  op: "text-amber-400",
  paren: "text-cyan-300",
  pct: "text-cyan-300",
  other: "text-slate-400",
};

function scaleFor(len: number): string {
  if (len <= 6) return "text-5xl sm:text-6xl";
  if (len <= 10) return "text-4xl sm:text-5xl";
  if (len <= 14) return "text-3xl sm:text-4xl";
  return "text-2xl sm:text-3xl";
}

export default function CalculatorDisplay({
  expression,
  bigValue,
  isPreview,
  error,
  committed,
  onCopy,
}: Props) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const segs = highlight(expression);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#131B2E] px-5 py-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]"
    >
      {/* top hairline glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      {/* expression line */}
      <div className="flex min-h-[2.25rem] items-end justify-between gap-3">
        <div
          aria-hidden
          className="flex-1 truncate text-right font-mono text-base tracking-tight text-slate-300 sm:text-lg"
        >
          {segs.length === 0 ? (
            <span className="text-slate-600">0</span>
          ) : (
            segs.map((s, i) => (
              <span key={i} className={segColor[s.kind]}>
                {s.text}
              </span>
            ))
          )}
          {!committed && (
            <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-amber-400 align-middle" style={{ height: "1.1em" }} />
          )}
        </div>
      </div>

      {/* result / preview line */}
      <div className="mt-1 flex items-end justify-end gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={bigValue + (error ? "e" : "v")}
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={
              error && !reduce
                ? { opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -6, 6, 0] }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`text-right font-mono font-semibold leading-none tracking-tight ${scaleFor(
              bigValue.length
            )} ${error ? "text-rose-400" : isPreview ? "text-slate-400" : "text-white"}`}
          >
            {bigValue}
          </motion.div>
        </AnimatePresence>

        {!error && (
          <button
            type="button"
            onClick={() => {
              onCopy(bigValue);
              setCopied(true);
            }}
            aria-label="Copy result to clipboard"
            className="mb-1 shrink-0 rounded-lg border border-white/5 p-2 text-slate-500 transition-colors hover:border-amber-400/30 hover:text-amber-400 active:scale-95"
          >
            {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
          </button>
        )}
      </div>

      {/* status badge */}
      <div className="mt-2 flex h-5 items-center justify-end">
        {error ? (
          <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-rose-400">
            {error}
          </span>
        ) : isPreview ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-600">
            live preview
          </span>
        ) : committed ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-amber-400/70">
            result
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}