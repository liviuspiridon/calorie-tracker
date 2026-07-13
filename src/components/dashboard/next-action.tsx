import { CompassIcon } from "lucide-react";

export function NextAction({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="bg-primary/10 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
        <CompassIcon className="size-3.5" aria-hidden="true" />
      </div>
      <p className="text-foreground/85 pt-0.5 text-sm leading-relaxed">{message}</p>
    </div>
  );
}
