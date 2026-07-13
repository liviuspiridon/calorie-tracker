/** A quiet editorial note, not a card or an icon chip. */
export function NextAction({ message }: { message: string }) {
  return (
    <div className="border-primary/30 border-l-2 pl-4">
      <p className="text-foreground/90 text-base leading-relaxed">{message}</p>
    </div>
  );
}
