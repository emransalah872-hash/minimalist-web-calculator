import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Trash, Copy, ArrowCounterClockwise } from "@phosphor-icons/react";
import type { HistoryItem } from "@/types/calculator";

interface Props {
  open: boolean;
  items: HistoryItem[];
  onClose: () => void;
  onRecall: (item: HistoryItem) => void;
  onCopy: (text: string) => void;
  onClear: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CalculatorHistory({
  open,
  items,
  onClose,
  onRecall,
  onCopy,
  onClear,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[min(92vw,22rem)] flex-col border-l border-white/5 bg-[#0F1524] shadow-2xl"
            role="dialog"
            aria-label="Calculation history"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-slate-300">
                History
              </h2>
              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={onClear}
                    aria-label="Clear history"
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 active:scale-95"
                  >
                    <Trash size={18} weight="bold" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close history"
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200 active:scale-95"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <ArrowCounterClockwise size={30} className="text-slate-700" weight="thin" />
                  <p className="text-sm text-slate-500">
                    No calculations yet. Results you commit with <span className="font-mono text-amber-400">=</span> appear here.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {items.map((it) => (
                      <motion.li
                        key={it.id}
                        layout
                        initial={reduce ? false : { opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, x: 24 }}
                        className="group rounded-xl border border-white/5 bg-[#131B2E] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onRecall(it)}
                            className="flex-1 text-left"
                            aria-label={`Recall ${it.formula}`}
                          >
                            <p className="truncate font-mono text-xs text-slate-500">{it.formula}</p>
                            <p className="mt-0.5 truncate font-mono text-lg font-semibold text-slate-100">
                              {it.result}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopy(it.result)}
                            aria-label="Copy result"
                            className="rounded-lg p-2 text-slate-600 opacity-0 transition-all hover:bg-white/5 hover:text-amber-400 group-hover:opacity-100 active:scale-95"
                          >
                            <Copy size={16} weight="bold" />
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-600">
                          {timeAgo(it.ts)}
                        </p>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}