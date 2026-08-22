"use client";

import * as React from "react";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  CameraIcon,
  Loader2Icon,
  MicIcon,
  XIcon,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { fileToCompressedBase64 } from "@/lib/image";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";
import { formatLocalDate } from "@/lib/utils";

import { editMealItems, reconcileMealWithPhoto, resolveMealTurn } from "../actions";
import { buildRecentHistory, looksLikeReference } from "../reference-history";
import {
  lowestConfidence,
  sumItemMacros,
  type HistoryMeal,
  type MealItem,
  type MealItemDraft,
  type MealLogEntry,
  type ReconciliationResult,
  type ReconciliationSuggestion,
} from "../types";
import { ConversationFeed, type FeedEntry } from "./conversation-feed";
import { ItemCard } from "./item-card";
import { ReconciliationPanel } from "./reconciliation-panel";

type BuilderStep = "building" | "review";

/** Recording-state accent for the Voice pill — the app has no red token. */
const VOICE_RED = "#E5484D";

/** At most this many clarifying questions per ingredient before forcing a low-confidence resolution — see handleSubmitItem. */
const MAX_CLARIFY_ROUNDS = 2;

interface PendingPhoto {
  base64: string;
  mimeType: "image/jpeg";
  /** `data:` URL for the inline thumbnail — same base64, just prefixed. */
  previewUrl: string;
  mode: "food" | "label";
}

/**
 * State while an ingredient turn is mid-resolution — the model asked a
 * clarifying question and is waiting for the user's reply. `exchange` holds
 * every completed question/answer round so far for this one ingredient;
 * `lastQuestion` is the one the next submission answers.
 */
interface PendingClarification {
  originalText?: string;
  photo: PendingPhoto | null;
  exchange: { question: string; answer: string }[];
  lastQuestion: string;
  /** Set when the ingredient this clarification is resolving was detected as a history reference — carried to every continuation reply so it isn't lost mid-thread. See looksLikeReference. */
  history?: HistoryMeal[];
  /** The "today" anchor `history` was built relative to — carried alongside it for the same reason. */
  historyDate?: string;
}

function withId(draft: MealItemDraft): MealItem {
  return { ...draft, id: crypto.randomUUID() };
}

function toDraft(item: MealItem): MealItemDraft {
  return {
    description: item.description,
    grams: item.grams,
    unit: item.unit,
    caloriesPer100g: item.caloriesPer100g,
    proteinPer100g: item.proteinPer100g,
    carbsPer100g: item.carbsPer100g,
    fatPer100g: item.fatPer100g,
    fiberPer100g: item.fiberPer100g,
    confidence: item.confidence,
    source: item.source,
  };
}

/** grams=100 makes the legacy aggregate values directly the per-100g rates — no scaling needed to seed a single synthetic item from an old one-shot meal. */
function itemFromAnalysis(analysis: MealLogEntry["analysis"]): MealItem {
  return {
    id: crypto.randomUUID(),
    description: analysis.description,
    grams: 100,
    caloriesPer100g: analysis.calories,
    proteinPer100g: analysis.protein,
    carbsPer100g: analysis.carbs,
    fatPer100g: analysis.fat,
    fiberPer100g: analysis.fiber,
    confidence: analysis.confidence,
  };
}

/**
 * Conversational, item-by-item meal builder: add ingredients one at a time
 * (text, voice, or photo — either a food photo or a nutrition-label photo
 * plus a quantity), each turn answered by the model with a confirmation +
 * prompt to continue/finish, or a clarifying question when the input is too
 * ambiguous to default. Then finalize into a review screen for weight/edit
 * adjustments — optionally checked against a photo of the plate — before
 * saving. Everything here — the conversation, in-progress photo, text — is
 * ephemeral component state; nothing is persisted until "Salvează masa"
 * builds the final MealLogEntry and hands it to `onSave`.
 *
 * `editingMeal`, when set, opens straight into the review step: seeded from
 * `editingMeal.items` when present, or a single synthetic item built from
 * the legacy aggregate `analysis` for meals logged before the builder
 * existed. Saving updates the existing entry (same id/loggedAt) instead of
 * creating a new one — there's no separate "edit meal" UI.
 */
export function MealBuilderSheet({
  open,
  onOpenChange,
  onSave,
  editingMeal,
  meals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `isNewEntry` is false when this is an edit to an existing meal — the
   *  caller uses it to decide whether a post-log nudge makes sense. */
  onSave: (entry: MealLogEntry, isNewEntry: boolean) => void;
  editingMeal?: MealLogEntry | null;
  /** Recent meal history for "like yesterday"/"the usual X" reference matching — see reference-history.ts. Already fetched by the caller's useMealLog(), no separate query needed here. */
  meals: MealLogEntry[];
}) {
  const [step, setStep] = React.useState<BuilderStep>("building");
  const [items, setItems] = React.useState<MealItem[]>([]);
  const [mealName, setMealName] = React.useState("");

  const [feed, setFeed] = React.useState<FeedEntry[]>([]);
  const [pendingClarification, setPendingClarification] = React.useState<PendingClarification | null>(null);

  const [text, setText] = React.useState("");
  const [photo, setPhoto] = React.useState<PendingPhoto | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const feedEndRef = React.useRef<HTMLDivElement | null>(null);

  const [editText, setEditText] = React.useState("");
  const [editBusy, setEditBusy] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  const [reconciliation, setReconciliation] = React.useState<ReconciliationResult | null>(null);
  const [reconcileBusy, setReconcileBusy] = React.useState(false);
  const [reconcileError, setReconcileError] = React.useState<string | null>(null);
  const reconcilePhotoInputRef = React.useRef<HTMLInputElement | null>(null);

  // The textarea value when dictation started — new speech is appended after
  // it, so a session's transcript re-renders cleanly without duplicating.
  const voiceBaseRef = React.useRef("");
  const {
    isSupported: voiceSupported,
    isListening,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
  } = useSpeechRecognition({
    lang: "ro-RO",
    onTranscript: (session) => {
      const base = voiceBaseRef.current;
      setText(base && session ? `${base} ${session}` : base + session);
    },
  });

  React.useEffect(() => {
    if (!open) return;
    if (editingMeal) {
      const seeded = editingMeal.items?.length
        ? editingMeal.items
        : [itemFromAnalysis(editingMeal.analysis)];
      setItems(seeded);
      setMealName(editingMeal.analysis.description);
      setStep("review");
    } else {
      setItems([]);
      setMealName("");
      setStep("building");
    }
    setText("");
    setPhoto(null);
    setError(null);
    setEditText("");
    setEditError(null);
    setFeed([]);
    setPendingClarification(null);
    setReconciliation(null);
    setReconcileError(null);
  }, [open, editingMeal]);

  // Dictation only makes sense on the building step of an open sheet.
  React.useEffect(() => {
    if (!open || step !== "building") stopVoice();
  }, [open, step, stopVoice]);

  React.useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end" });
  }, [feed]);

  function resetSession() {
    stopVoice();
    setStep("building");
    setItems([]);
    setMealName("");
    setText("");
    setPhoto(null);
    setError(null);
    setEditText("");
    setEditError(null);
    setFeed([]);
    setPendingClarification(null);
    setReconciliation(null);
    setReconcileError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetSession();
    onOpenChange(next);
  }

  function handleToggleVoice() {
    if (isListening) {
      stopVoice();
    } else {
      voiceBaseRef.current = text.trim();
      startVoice();
    }
  }

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so picking the same file twice still fires onChange.
    event.target.value = "";
    if (!file) return;

    stopVoice();
    setError(null);
    try {
      const image = await fileToCompressedBase64(file);
      setPhoto({
        base64: image.data,
        mimeType: image.mimeType,
        previewUrl: `data:${image.mimeType};base64,${image.data}`,
        mode: "food",
      });
    } catch {
      setError("Couldn't read that photo. Try again.");
    }
  }

  async function handleSubmitItem() {
    const trimmed = text.trim();
    if (!trimmed && !photo) return;

    const clarifying = pendingClarification;
    const activePhoto = photo ?? (clarifying ? clarifying.photo : null);

    setFeed((prev) => [
      ...prev,
      {
        kind: "message",
        message: { id: crypto.randomUUID(), role: "user", text: trimmed, photoPreviewUrl: photo?.previewUrl },
      },
    ]);
    setBusy(true);
    setError(null);

    try {
      const context = clarifying
        ? {
            originalText: clarifying.originalText,
            exchange: [...clarifying.exchange, { question: clarifying.lastQuestion, answer: trimmed }],
          }
        : undefined;
      // Questions already asked for this ingredient (the pending one counts,
      // even though it isn't in `exchange` until this reply completes it).
      // At the cap, this reply must resolve rather than risk one more question.
      const questionsAsked = clarifying ? clarifying.exchange.length + 1 : 0;
      const forceResolve = questionsAsked >= MAX_CLARIFY_ROUNDS;

      // Reference detection only runs on a fresh ingredient — a clarify
      // continuation (e.g. "cel de luni") carries forward whatever the
      // first turn decided, rather than re-running a heuristic that a
      // short reply might not match on its own.
      const isReference = clarifying ? !!clarifying.history : looksLikeReference(trimmed);
      const history = clarifying ? clarifying.history : isReference ? buildRecentHistory(meals) : undefined;
      const historyDate = clarifying ? clarifying.historyDate : isReference ? formatLocalDate(new Date()) : undefined;

      const result = await resolveMealTurn({
        text: trimmed || undefined,
        image: activePhoto ? { data: activePhoto.base64, mimeType: activePhoto.mimeType } : undefined,
        mode: activePhoto?.mode,
        context,
        forceResolve,
        history,
        historyDate,
      });

      setFeed((prev) => [
        ...prev,
        { kind: "message", message: { id: crypto.randomUUID(), role: "assistant", text: result.message } },
      ]);

      if (result.status === "clarify") {
        setPendingClarification({
          originalText: clarifying ? clarifying.originalText : trimmed || undefined,
          photo: activePhoto,
          exchange: context?.exchange ?? [],
          lastQuestion: result.message,
          history,
          historyDate,
        });
      } else {
        setPendingClarification(null);
        if (result.item) {
          const newItem = withId(result.item);
          setItems((prev) => [...prev, newItem]);
          setFeed((prev) => [...prev, { kind: "item", itemId: newItem.id }]);
        }
      }

      setText("");
      setPhoto(null);
    } catch {
      setError("Couldn't add that item. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleRemoveItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setFeed((prev) => prev.filter((entry) => !(entry.kind === "item" && entry.itemId === id)));
    // Reconciliation suggestions reference items by array index — no longer
    // reliable once the array's shape changes.
    setReconciliation(null);
  }

  function handleGramsChange(id: string, grams: number) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, grams: Math.max(1, grams) } : item)),
    );
  }

  function handleFinalize() {
    if (items.length === 0) return;
    setMealName(items.map((item) => item.description).join(", "));
    setStep("review");
  }

  async function handleEditSubmit() {
    const trimmed = editText.trim();
    if (!trimmed || items.length === 0) return;

    setEditBusy(true);
    setEditError(null);
    try {
      const updated = await editMealItems(items.map(toDraft), trimmed);
      setItems(updated.map(withId));
      setEditText("");
    } catch {
      setEditError("Couldn't apply that change. Try again.");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleReconcilePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || items.length === 0) return;

    setReconcileBusy(true);
    setReconcileError(null);
    try {
      const image = await fileToCompressedBase64(file);
      const result = await reconcileMealWithPhoto(items.map(toDraft), {
        data: image.data,
        mimeType: image.mimeType,
      });
      setReconciliation(result);
    } catch {
      setReconcileError("Couldn't check that photo. Try again.");
    } finally {
      setReconcileBusy(false);
    }
  }

  function handleAcceptSuggestion(suggestion: ReconciliationSuggestion) {
    const target = items[suggestion.targetIndex];
    if (target) handleGramsChange(target.id, suggestion.suggestedGrams);
    setReconciliation((prev) =>
      prev ? { ...prev, suggestions: prev.suggestions.filter((s) => s !== suggestion) } : prev,
    );
  }

  function handleDismissSuggestion(suggestion: ReconciliationSuggestion) {
    setReconciliation((prev) =>
      prev ? { ...prev, suggestions: prev.suggestions.filter((s) => s !== suggestion) } : prev,
    );
  }

  function handleSave() {
    if (items.length === 0) return;
    const totals = sumItemMacros(items);
    const analysis = {
      description: mealName.trim() || items.map((item) => item.description).join(", "),
      ...totals,
      confidence: lowestConfidence(items),
    };
    const entry: MealLogEntry = editingMeal
      ? { ...editingMeal, analysis, items }
      : { id: crypto.randomUUID(), loggedAt: new Date().toISOString(), analysis, items };
    onSave(entry, !editingMeal);
    resetSession();
    onOpenChange(false);
  }

  const canSubmitItem = (text.trim().length > 0 || photo !== null) && !busy;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        style={{ ...TODAY_FONT, background: TODAY.bg, borderRadius: "30px 30px 0 0" }}
        className="mx-auto flex max-h-[88vh] w-full flex-col overflow-hidden border-none px-0 pt-5 pb-0 shadow-[0_-12px_40px_-12px_rgba(20,23,15,0.3)] sm:max-w-lg"
      >
        {step === "building" ? (
          <>
            <div className="flex shrink-0 items-center justify-between px-[22px]">
              <SheetTitle className="text-[15px] font-bold" style={{ color: TODAY.ink }}>
                {editingMeal ? "Edit meal" : "Log a meal"}
              </SheetTitle>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="text-[13px] font-semibold"
                style={{ color: TODAY.ink50 }}
              >
                Cancel
              </button>
            </div>

            {items.length > 0 && (
              <div className="mt-3 shrink-0 px-[22px]">
                <RunningTotalBanner items={items} />
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-[22px]">
              <ConversationFeed
                entries={feed}
                items={items}
                onDeleteItem={handleRemoveItem}
                emptyLabel="Add your first ingredient below — by text, voice, or photo."
              />
              <div ref={feedEndRef} />
            </div>

            <div
              className="shrink-0 px-[22px] pt-3 pb-[26px]"
              style={{ borderTop: `1px solid ${TODAY.hairline}` }}
            >
              {photo && (
                <div className="mb-3 flex items-center gap-2.5 rounded-2xl p-2" style={{ background: TODAY.chip2 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- transient client-only data: URL preview, not a static asset */}
                  <img src={photo.previewUrl} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
                  <div className="flex flex-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPhoto((prev) => prev && { ...prev, mode: "food" })}
                      className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold"
                      style={
                        photo.mode === "food"
                          ? { background: TODAY.ink, color: TODAY.accent }
                          : { background: TODAY.bg, color: TODAY.ink55 }
                      }
                    >
                      Food photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoto((prev) => prev && { ...prev, mode: "label" })}
                      className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold"
                      style={
                        photo.mode === "label"
                          ? { background: TODAY.ink, color: TODAY.accent }
                          : { background: TODAY.bg, color: TODAY.ink55 }
                      }
                    >
                      Nutrition label
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    aria-label="Remove photo"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: TODAY.bg, color: TODAY.ink45 }}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void handleSubmitItem();
                  }
                }}
                placeholder={
                  photo
                    ? "Optional: quantity, e.g. 150g"
                    : pendingClarification
                      ? "Your answer…"
                      : "Adaugă alt ingredient… (ex. 300g roșii, 2 ouă)"
                }
                rows={2}
                disabled={busy}
                className="w-full resize-none rounded-[20px] px-[18px] py-4 text-[15px] font-medium outline-none placeholder:text-[rgba(20,23,15,0.4)]"
                style={{ background: TODAY.chip2, color: TODAY.ink }}
              />
              {error && (
                <p className="mt-2 text-sm" style={{ color: "#B3453A" }}>
                  {error}
                </p>
              )}
              <div className="mt-[14px] flex items-center gap-1.5 sm:gap-2.5">
                <ComposerModePill
                  icon={
                    <span className="text-[13px] font-bold" style={{ color: TODAY.ink }}>
                      Aa
                    </span>
                  }
                  label="Text"
                />
                <ComposerModePill
                  icon={<MicIcon className="size-3.5" />}
                  label="Voice"
                  onClick={handleToggleVoice}
                  active={isListening}
                  disabled={!voiceSupported || busy}
                  badge={voiceSupported ? undefined : "SOON"}
                />
                <ComposerModePill
                  icon={<CameraIcon className="size-3.5" />}
                  label="Photo"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={busy}
                />
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleSubmitItem}
                  disabled={!canSubmitItem}
                  aria-label="Add item"
                  className="flex size-[46px] shrink-0 items-center justify-center rounded-full text-xl font-bold disabled:opacity-40"
                  style={{ background: TODAY.accent, color: TODAY.ink }}
                >
                  {busy ? (
                    <Loader2Icon className="size-5 animate-spin" />
                  ) : (
                    <ArrowUpIcon className="size-5" strokeWidth={2.75} />
                  )}
                </button>
              </div>
              {/* Deliberately no `capture` attribute: it would force the camera
                  open and remove the Photo Library option, so meals you
                  photographed earlier couldn't be logged. Without it, mobile
                  shows the native Camera / Library / Browse menu. */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelected}
                className="hidden"
              />
              {isListening && (
                <p className="mt-2 text-[11.5px] font-medium" style={{ color: VOICE_RED }}>
                  Listening in Romanian — tap the mic again to stop.
                </p>
              )}
              {voiceError && (
                <p className="mt-2 text-[11.5px] font-medium" style={{ color: VOICE_RED }}>
                  {voiceError === "not-allowed" || voiceError === "service-not-allowed"
                    ? "Microphone access is blocked — enable it in your browser settings."
                    : "Voice input isn't available right now."}
                </p>
              )}

              <button
                type="button"
                onClick={handleFinalize}
                disabled={items.length === 0}
                className="mt-3 h-12 w-full rounded-full text-sm font-bold disabled:opacity-40"
                style={{ background: TODAY.ink, color: TODAY.accent }}
              >
                Finalizează masa
              </button>
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pt-0 pb-7">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("building")}
                aria-label="Back to building"
                className="flex size-8 items-center justify-center rounded-full"
                style={{ background: TODAY.chip2, color: TODAY.ink }}
              >
                <ArrowLeftIcon className="size-4" />
              </button>
              <SheetTitle className="text-[15px] font-bold" style={{ color: TODAY.ink }}>
                Review meal
              </SheetTitle>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="text-[13px] font-semibold"
                style={{ color: TODAY.ink50 }}
              >
                Cancel
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <label
                htmlFor="meal-name"
                className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: TODAY.ink45 }}
              >
                Meal name
              </label>
              <input
                id="meal-name"
                type="text"
                value={mealName}
                onChange={(event) => setMealName(event.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none"
                style={{ background: TODAY.chip2, color: TODAY.ink }}
              />
            </div>

            <div className="mt-5 space-y-2">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleRemoveItem(item.id)}
                  onGramsChange={(grams) => handleGramsChange(item.id, grams)}
                />
              ))}
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
                  style={{ color: TODAY.ink45 }}
                >
                  Check against your plate
                </label>
                <button
                  type="button"
                  onClick={() => reconcilePhotoInputRef.current?.click()}
                  disabled={reconcileBusy}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                  style={{ background: TODAY.chip2, color: TODAY.ink }}
                >
                  {reconcileBusy ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <CameraIcon className="size-3.5" />
                  )}
                  Plate photo
                </button>
              </div>
              <input
                ref={reconcilePhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleReconcilePhotoSelected}
                className="hidden"
              />
              {reconcileError && (
                <p className="text-sm" style={{ color: "#B3453A" }}>
                  {reconcileError}
                </p>
              )}
              {reconciliation && (
                <>
                  {reconciliation.suggestions.length === 0 ? (
                    <p className="text-[12.5px] font-medium" style={{ color: TODAY.ink45 }}>
                      {reconciliation.message}
                    </p>
                  ) : (
                    <>
                      <p className="text-[12.5px] font-medium" style={{ color: TODAY.ink45 }}>
                        {reconciliation.message}
                      </p>
                      <ReconciliationPanel
                        suggestions={reconciliation.suggestions}
                        items={items}
                        onAccept={handleAcceptSuggestion}
                        onDismiss={handleDismissSuggestion}
                      />
                    </>
                  )}
                </>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <label
                htmlFor="edit-instruction"
                className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: TODAY.ink45 }}
              >
                Ask for a change
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="edit-instruction"
                  type="text"
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void handleEditSubmit();
                    }
                  }}
                  placeholder="e.g. change white bread to sourdough"
                  disabled={editBusy}
                  className="min-w-0 flex-1 rounded-2xl px-4 py-3 text-[14px] font-medium outline-none placeholder:text-[rgba(20,23,15,0.4)]"
                  style={{ background: TODAY.chip2, color: TODAY.ink }}
                />
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={!editText.trim() || editBusy}
                  aria-label="Apply change"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
                  style={{ background: TODAY.ink, color: TODAY.accent }}
                >
                  {editBusy ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <ArrowUpIcon className="size-4" strokeWidth={2.75} />
                  )}
                </button>
              </div>
              {editError && (
                <p className="text-sm" style={{ color: "#B3453A" }}>
                  {editError}
                </p>
              )}
            </div>

            <TotalsSummary items={items} />

            <div className="mt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={items.length === 0}
                className="h-12 w-full rounded-full text-sm font-bold disabled:opacity-40"
                style={{ background: TODAY.ink, color: TODAY.accent }}
              >
                Salvează masa
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function RunningTotalBanner({ items }: { items: MealItem[] }) {
  const totals = sumItemMacros(items);
  return (
    <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: TODAY.ink }}>
      <span className="text-[13px] font-bold" style={{ color: TODAY.accent }}>
        {items.length} item{items.length === 1 ? "" : "s"} added
      </span>
      <span className="text-[13px] font-medium" style={{ color: "rgba(252,252,250,0.6)" }}>
        • ~{totals.calories} kcal
      </span>
    </div>
  );
}

function TotalsSummary({ items }: { items: MealItem[] }) {
  const totals = sumItemMacros(items);
  return (
    <div className="mt-5">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums" style={{ color: TODAY.ink }}>
          {totals.calories}
        </span>
        <span className="text-[13px] font-semibold" style={{ color: TODAY.ink40 }}>
          kcal total
        </span>
      </div>
      <div
        className="mt-[14px] flex"
        style={{
          borderTop: `1px solid ${TODAY.hairlineStrong}`,
          borderBottom: `1px solid ${TODAY.hairlineStrong}`,
        }}
      >
        <MacroTile label="Protein" value={totals.protein} />
        <div className="w-px" style={{ background: TODAY.hairlineStrong }} />
        <MacroTile label="Carbs" value={totals.carbs} />
        <div className="w-px" style={{ background: TODAY.hairlineStrong }} />
        <MacroTile label="Fat" value={totals.fat} />
        <div className="w-px" style={{ background: TODAY.hairlineStrong }} />
        <MacroTile label="Fiber" value={totals.fiber} />
      </div>
    </div>
  );
}

function MacroTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 py-3 text-center">
      <div className="text-base font-bold tabular-nums" style={{ color: TODAY.ink }}>
        {value}g
      </div>
      <div
        className="font-mono text-[9px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: TODAY.ink40 }}
      >
        {label}
      </div>
    </div>
  );
}

function ComposerModePill({
  icon,
  label,
  disabled,
  badge,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  badge?: string;
  /** Recording state (Voice pill) — red tint + pulse. */
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-[14px] px-3 py-[11px] text-xs font-semibold sm:px-[15px] ${
        disabled ? "pointer-events-none cursor-not-allowed" : ""
      }`}
      style={{
        background: active ? "rgba(229,72,77,0.12)" : TODAY.chip2,
        color: active ? VOICE_RED : TODAY.ink55,
      }}
    >
      {/* See the equivalent pill in the previous single-shot composer for why
          opacity/pulse live on this inner wrapper rather than the button. */}
      <span
        className={`flex items-center gap-2 ${disabled ? "opacity-40" : ""} ${
          active ? "animate-pulse" : ""
        }`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </span>
      {badge && !active && (
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-neutral-900 uppercase shadow-sm sm:ml-1.5">
          {badge}
        </span>
      )}
    </button>
  );
}
