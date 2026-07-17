import { ArrowUpIcon, MicIcon } from "lucide-react";

import { TODAY } from "@/lib/today-theme";

/** The persistent trigger — tapping anywhere on it opens LogMealSheet's compose step. */
export function MealComposerBar({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
      <div
        className="pointer-events-auto mx-auto max-w-lg px-7 pt-3 pb-[26px]"
        style={{ background: "linear-gradient(rgba(252,252,250,0), #FCFCFA 26%)" }}
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-3 rounded-full py-[9px] pr-[9px] pl-5 text-left shadow-[0_6px_20px_-12px_rgba(20,23,15,0.25)]"
          style={{ background: TODAY.chip2, border: `1px solid ${TODAY.hairlineStrong}` }}
        >
          <span className="flex-1 text-[14.5px] font-medium" style={{ color: TODAY.ink45 }}>
            What did you eat?
          </span>
          <MicIcon className="size-[18px] shrink-0" style={{ color: TODAY.ink40 }} />
          <span
            className="flex size-[38px] shrink-0 items-center justify-center rounded-full"
            style={{ background: TODAY.ink, color: TODAY.accent }}
          >
            <ArrowUpIcon className="size-[18px]" strokeWidth={2.75} />
          </span>
        </button>
      </div>
    </div>
  );
}
