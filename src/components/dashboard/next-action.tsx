import { TODAY } from "@/lib/today-theme";

/** Renders whatever getNextAction() (features/goals) returns — presentation only. */
export function NextAction({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-[9px] px-0.5">
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: TODAY.accentInk }}
        className="mt-1.5 shrink-0"
      />
      <span className="text-[13px] leading-[1.5] font-medium" style={{ color: TODAY.ink62 }}>
        {message}
      </span>
    </div>
  );
}
