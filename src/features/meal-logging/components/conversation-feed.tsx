"use client";

import { TODAY } from "@/lib/today-theme";

import type { ConversationMessage, MealItem } from "../types";
import { ItemCard } from "./item-card";

/**
 * One entry in the building-step timeline — either a chat turn or a
 * resolved ingredient, in true chronological order. Items are referenced
 * by id rather than embedded so `items` (the meal's source of truth,
 * managed by MealBuilderSheet) never has a second copy to fall out of sync
 * with.
 */
export type FeedEntry = { kind: "message"; message: ConversationMessage } | { kind: "item"; itemId: string };

/**
 * The building step's conversation: user turns, assistant confirmations/
 * clarifying questions, and resolved-item cards, all in one scrollable
 * timeline — a resolved item is itself the answer to "what did the
 * assistant just confirm", so it belongs in the same feed as the messages
 * around it rather than a separate list.
 */
export function ConversationFeed({
  entries,
  items,
  onDeleteItem,
  emptyLabel,
}: {
  entries: FeedEntry[];
  items: MealItem[];
  onDeleteItem: (id: string) => void;
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] font-medium" style={{ color: TODAY.ink45 }}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {entries.map((entry) => {
        if (entry.kind === "message") {
          return <MessageBubble key={entry.message.id} message={entry.message} />;
        }
        const item = items.find((candidate) => candidate.id === entry.itemId);
        if (!item) return null;
        return <ItemCard key={item.id} item={item} onDelete={() => onDeleteItem(item.id)} />;
      })}
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] font-medium"
        style={isUser ? { background: TODAY.ink, color: TODAY.accent } : { background: TODAY.chip2, color: TODAY.ink }}
      >
        {message.photoPreviewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- transient client-only data: URL preview, not a static asset
          <img src={message.photoPreviewUrl} alt="" className="mb-1.5 h-24 w-full rounded-xl object-cover" />
        )}
        {message.text && <p>{message.text}</p>}
      </div>
    </div>
  );
}
