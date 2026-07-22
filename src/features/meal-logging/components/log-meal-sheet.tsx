"use client";

import * as React from "react";
import { ArrowUpIcon, CameraIcon, Loader2Icon, MicIcon } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { fileToCompressedBase64 } from "@/lib/image";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

import { analyzeMeal, analyzeMealPhoto } from "../actions";
import type { MealAnalysis, MealLogEntry } from "../types";

type FlowState =
  | { step: "compose" }
  | { step: "analyzing" }
  | { step: "review"; analysis: MealAnalysis }
  | { step: "error"; message: string };

const EMPTY_ANALYSIS: MealAnalysis = {
  description: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

/** Recording-state accent for the Voice pill — the app has no red token. */
const VOICE_RED = "#E5484D";

/**
 * The approved "Balance Today" design only covers the compose step (this is
 * the sheet it opens into) — the review/edit step below follows a separate
 * spec (neutral-900/neutral-400 editorial style, underline-only inputs),
 * given directly for that step rather than inferred from the compose step's
 * cream/lime palette.
 *
 * `editingMeal`, when set, is also how meal editing reuses this same flow:
 * the sheet opens straight into the review step pre-filled with that meal's
 * data, and saving updates the existing entry (same id/loggedAt) instead of
 * creating a new one. There's no separate "edit meal" UI.
 */
export function LogMealSheet({
  open,
  onOpenChange,
  onSave,
  editingMeal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `isNewEntry` is false when this is an edit to an existing meal — the
   *  caller uses it to decide whether a post-log nudge makes sense. */
  onSave: (entry: MealLogEntry, isNewEntry: boolean) => void;
  editingMeal?: MealLogEntry | null;
}) {
  const [text, setText] = React.useState("");
  const [flow, setFlow] = React.useState<FlowState>({ step: "compose" });
  const [draft, setDraft] = React.useState<MealAnalysis>(EMPTY_ANALYSIS);

  const [photoBusy, setPhotoBusy] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

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
      setText(editingMeal.note ?? "");
      setDraft(editingMeal.analysis);
      setFlow({ step: "review", analysis: editingMeal.analysis });
    } else {
      setText("");
      setDraft(EMPTY_ANALYSIS);
      setFlow({ step: "compose" });
    }
  }, [open, editingMeal]);

  // Dictation only makes sense on the compose step of an open sheet — stop it
  // if the sheet closes or the flow advances (analyzing/review).
  React.useEffect(() => {
    if (!open || flow.step !== "compose") stopVoice();
  }, [open, flow.step, stopVoice]);

  function reset() {
    stopVoice();
    setText("");
    setFlow({ step: "compose" });
    setDraft(EMPTY_ANALYSIS);
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
    setPhotoBusy(true);
    try {
      const image = await fileToCompressedBase64(file);
      const analysis = await analyzeMealPhoto(image);
      setDraft(analysis);
      // Keeps the saved entry's note meaningful — there's no typed text here.
      setText(analysis.description);
      setFlow({ step: "review", analysis });
    } catch {
      setFlow({ step: "error", message: "Couldn't read that photo. Try again." });
    } finally {
      setPhotoBusy(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleAnalyze() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setFlow({ step: "analyzing" });
    try {
      const analysis = await analyzeMeal(trimmed);
      setDraft(analysis);
      setFlow({ step: "review", analysis });
    } catch {
      setFlow({ step: "error", message: "Couldn't analyze that meal. Try again." });
    }
  }

  function handleSave() {
    const entry: MealLogEntry = editingMeal
      ? { ...editingMeal, analysis: draft }
      : {
          id: crypto.randomUUID(),
          loggedAt: new Date().toISOString(),
          analysis: draft,
          note: text.trim(),
        };
    onSave(entry, !editingMeal);
    reset();
    onOpenChange(false);
  }

  const isComposing =
    flow.step === "compose" || flow.step === "analyzing" || flow.step === "error";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        style={{ ...TODAY_FONT, background: TODAY.bg, borderRadius: "30px 30px 0 0" }}
        className="mx-auto max-h-[85vh] w-full overflow-y-auto border-none px-[22px] pt-5 pb-[26px] shadow-[0_-12px_40px_-12px_rgba(20,23,15,0.3)] sm:max-w-lg"
      >
        <div className="flex items-center justify-between">
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

        {isComposing && (
          <div className="mt-4">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                // Plain Enter submits; Shift+Enter keeps inserting a newline.
                // isComposing guards IME input (e.g. Japanese), where Enter
                // confirms the composition rather than submitting.
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void handleAnalyze();
                }
              }}
              placeholder="e.g. 200g grilled chicken with rice and vegetables"
              rows={4}
              disabled={flow.step === "analyzing"}
              autoFocus
              className="w-full resize-none rounded-[20px] px-[18px] py-4 text-[15px] font-medium outline-none placeholder:text-[rgba(20,23,15,0.4)]"
              style={{ background: TODAY.chip2, color: TODAY.ink }}
            />
            {flow.step === "error" && (
              <p className="mt-2 text-sm" style={{ color: "#B3453A" }}>
                {flow.message}
              </p>
            )}
            <p className="mt-3 text-[11.5px] font-medium" style={{ color: TODAY.ink45 }}>
              Describe it in your own words — Coach reads the macros and you confirm.
            </p>
            <div className="mt-[18px] flex items-center gap-1.5 sm:gap-2.5">
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
                disabled={!voiceSupported || flow.step === "analyzing"}
                badge={voiceSupported ? undefined : "SOON"}
              />
              <ComposerModePill
                icon={
                  photoBusy ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <CameraIcon className="size-3.5" />
                  )
                }
                label="Photo"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoBusy || flow.step === "analyzing"}
              />
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!text.trim() || flow.step === "analyzing"}
                aria-label="Analyze meal"
                className="flex size-[46px] shrink-0 items-center justify-center rounded-full text-xl font-bold disabled:opacity-40"
                style={{ background: TODAY.accent, color: TODAY.ink }}
              >
                {flow.step === "analyzing" ? (
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
            {photoBusy && (
              <p className="mt-2 text-[11.5px] font-medium" style={{ color: TODAY.ink45 }}>
                Reading your photo — Coach is estimating the macros.
              </p>
            )}
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
          </div>
        )}

        {flow.step === "review" && (
          <div className="space-y-6 p-6">
            <div className="space-y-1.5">
              <label
                htmlFor="meal-description"
                className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase"
              >
                Description
              </label>
              <input
                id="meal-description"
                type="text"
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full border-0 border-b border-neutral-100 bg-transparent px-0 py-1.5 text-[15px] font-medium text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Calories"
                value={draft.calories}
                onChange={(value) => setDraft((prev) => ({ ...prev, calories: value }))}
              />
              <NumberField
                label="Protein (g)"
                value={draft.protein}
                onChange={(value) => setDraft((prev) => ({ ...prev, protein: value }))}
              />
              <NumberField
                label="Carbs (g)"
                value={draft.carbs}
                onChange={(value) => setDraft((prev) => ({ ...prev, carbs: value }))}
              />
              <NumberField
                label="Fat (g)"
                value={draft.fat}
                onChange={(value) => setDraft((prev) => ({ ...prev, fat: value }))}
              />
            </div>

            {/* Confidence isn't persisted (no column in the meals table), so
                edits of reloaded meals simply don't show the row. */}
            {draft.confidence && (
              <div className="flex items-center">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Confidence
                </span>
                <ConfidenceBadge confidence={draft.confidence} />
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={handleSave}
                className="w-full rounded-xl bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
              >
                Save meal
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
      {/*
        Opacity lives on this inner wrapper, not the button itself — the
        button (and therefore the badge below, a sibling outside this
        wrapper) stays at full opacity, so "SOON" reads crisp and
        high-contrast instead of fading along with the dimmed icon/label.
        When active (recording), the same wrapper pulses its opacity for a
        subtle live-recording cue.

        Below sm the text label is hidden (icon + badge only): the three
        pills plus the submit button don't fit a 375px viewport at full
        size, and the row previously forced horizontal scrolling. The
        aria-label above keeps the accessible name when the visible label
        is display:none.
      */}
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = React.useId();

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full border-0 border-b border-neutral-100 bg-transparent px-0 py-1.5 text-[15px] font-semibold text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:outline-none"
      />
    </div>
  );
}

type Confidence = NonNullable<MealAnalysis["confidence"]>;

const CONFIDENCE_STYLES: Record<Confidence, { badge: string; dot: string }> = {
  low: { badge: "bg-neutral-100 text-neutral-600", dot: "bg-neutral-400" },
  medium: { badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  high: { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { badge, dot } = CONFIDENCE_STYLES[confidence];

  return (
    <span
      className={`ml-2 inline-flex items-center space-x-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{confidence}</span>
    </span>
  );
}
