import { motion, useReducedMotion } from "framer-motion";
import type { CalcKey, KeyKind } from "@/types/calculator";

interface Props {
  onKey: (id: string) => void;
  flashId: string | null;
  canCloseParen: boolean;
}

const KEYS: CalcKey[] = [
  { id: "C", label: "AC", kind: "util", aria: "All clear" },
  { id: "sign", label: "±", kind: "fn", aria: "Toggle sign" },
  { id: "percent", label: "%", kind: "fn", aria: "Percent" },
  { id: "divide", label: "÷", kind: "op", aria: "Divide" },

  { id: "7", label: "7", kind: "digit" },
  { id: "8", label: "8", kind: "digit" },
  { id: "9", label: "9", kind: "digit" },
  { id: "multiply", label: "×", kind: "op", aria: "Multiply" },

  { id: "4", label: "4", kind: "digit" },
  { id: "5", label: "5", kind: "digit" },
  { id: "6", label: "6", kind: "digit" },
  { id: "subtract", label: "−", kind: "op", aria: "Subtract" },

  { id: "1", label: "1", kind: "digit" },
  { id: "2", label: "2", kind: "digit" },
  { id: "3", label: "3", kind: "digit" },
  { id: "add", label: "+", kind: "op", aria: "Add" },

  { id: "lparen", label: "(", kind: "fn", aria: "Open parenthesis" },
  { id: "rparen", label: ")", kind: "fn", aria: "Close parenthesis" },
  { id: "power", label: "xʸ", kind: "fn", aria: "Power" },
  { id: "equals", label: "=", kind: "equals", aria: "Equals" },

  { id: "back", label: "⌫", kind: "util", aria: "Backspace" },
  { id: "0", label: "0", kind: "digit", colSpan: 2 },
  { id: "decimal", label: ".", kind: "digit", aria: "Decimal point" },
];

const kindClasses: Record<KeyKind, string> = {
  digit:
    "bg-[#1B2438] text-slate-100 border-white/5 hover:bg-[#232e47] active:bg-[#2a3855]",
  op: "bg-[#232E4C] text-cyan-300 border-cyan-400/10 hover:bg-[#2b3a60] active:bg-[#344470]",
  fn: "bg-[#16202F] text-amber-300/90 border-white/5 hover:bg-[#1d2a3d] active:bg-[#243349]",
  util:
    "bg-[#16202F] text-rose-300 border-white/5 hover:bg-[#1d2a3d] active:bg-[#243349]",
  equals:
    "bg-gradient-to-b from-amber-400 to-amber-500 text-[#0B0F17] border-amber-300/30 hover:from-amber-300 hover:to-amber-400 shadow-[0_8px_24px_-8px_rgba(245,158,11,0.6)]",
};

export default function CalculatorKeypad({ onKey, flashId, canCloseParen }: Props) {
  const reduce = useReducedMotion();

  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
      {KEYS.map((k) => {
        const disabled = k.id === "rparen" && !canCloseParen;
        const flashing = flashId === k.id;
        return (
          <motion.button
            key={k.id}
            type="button"
            disabled={disabled}
            aria-label={k.aria ?? k.label}
            onClick={() => onKey(k.id)}
            style={{ gridColumn: k.colSpan ? `span ${k.colSpan}` : undefined }}
            whileTap={reduce ? undefined : { scale: 0.94 }}
            transition={{ duration: 0.08 }}
            className={`relative flex h-16 select-none items-center justify-center rounded-2xl border font-mono text-2xl font-medium tracking-tight transition-colors duration-75 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:opacity-30 disabled:hover:bg-[#16202F] sm:h-[4.5rem] ${
              kindClasses[k.kind]
            }`}
          >
            <span className={k.kind === "equals" ? "text-3xl font-bold" : ""}>
              {k.label}
            </span>
            {/* keyboard flash ring */}
            {flashing && !reduce && (
              <motion.span
                layoutId={`flash-${k.id}`}
                initial={{ opacity: 0.85, scale: 0.9 }}
                animate={{ opacity: 0, scale: 1.08 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-amber-300"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
