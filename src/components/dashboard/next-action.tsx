import { CompassIcon } from "lucide-react";

export function NextAction({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3">
      <CompassIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
    </div>
  );
}
