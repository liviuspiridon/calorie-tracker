"use client";

import * as React from "react";

// Minimal types for the Web Speech API — it isn't in the standard TS DOM lib,
// and `webkitSpeechRecognition` (the name iOS Safari and Chrome expose) is
// never typed. We only declare the surface this hook actually touches.
interface SpeechAlternative {
  readonly transcript: string;
}
interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechAlternative;
}
interface SpeechResultList {
  readonly length: number;
  readonly [index: number]: SpeechResult;
}
interface SpeechResultEvent {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}
interface SpeechErrorEvent {
  readonly error: string;
}
interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag. Defaults to Romanian. */
  lang?: string;
  /**
   * Fires as speech is transcribed with the full text of the *current
   * session* (finalized phrases plus the live in-progress phrase). The
   * consumer decides where to put it — appending to a field means storing the
   * field's value at start() and rendering `base + transcript`.
   */
  onTranscript: (sessionTranscript: string) => void;
}

interface UseSpeechRecognitionResult {
  /** False when the browser has no Web Speech API (e.g. Firefox, some desktops). */
  isSupported: boolean;
  isListening: boolean;
  /** Last non-recoverable error (e.g. "not-allowed" when mic permission is denied). */
  error: string | null;
  /** Must be called inside a user-gesture handler — iOS Safari rejects it otherwise. */
  start: () => void;
  stop: () => void;
}

/**
 * Thin React wrapper over the native Web Speech API — no third-party SDK, so
 * it works on iOS Safari (via `webkitSpeechRecognition`), where the browser
 * does the transcription on-device/server-side for free.
 *
 * iOS Safari specifics this handles:
 * - `start()` must run inside the tap gesture, so the hook never auto-starts.
 * - Safari ignores `continuous` and ends the session after each pause; we
 *   restart on `onend` while the user still wants to listen, which yields
 *   continuous dictation across Safari and Chrome without re-prompting.
 */
export function useSpeechRecognition({
  lang = "ro-RO",
  onTranscript,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const finalizedRef = React.useRef("");
  // True between start() and stop(); drives the restart-on-end loop.
  const wantsToListenRef = React.useRef(false);

  // Keep the latest callback without re-subscribing the recognition handlers.
  const onTranscriptRef = React.useRef(onTranscript);
  React.useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const isSupported = React.useMemo(() => getRecognitionCtor() !== null, []);

  const stop = React.useCallback(() => {
    wantsToListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = React.useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || wantsToListenRef.current) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalizedRef.current += transcript;
        } else {
          interim += transcript;
        }
      }
      onTranscriptRef.current((finalizedRef.current + interim).trimStart());
    };

    recognition.onerror = (event) => {
      // "no-speech" / "aborted" are recoverable — let onend decide whether to
      // restart. Permission and other errors are terminal.
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(event.error);
      wantsToListenRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      // Safari ends the session after each utterance; resume if still wanted.
      if (wantsToListenRef.current) {
        try {
          recognition.start();
        } catch {
          wantsToListenRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    finalizedRef.current = "";
    wantsToListenRef.current = true;
    setError(null);
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      wantsToListenRef.current = false;
      setIsListening(false);
      setError(err instanceof Error ? err.message : "start-failed");
    }
  }, [lang]);

  React.useEffect(() => {
    return () => {
      wantsToListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { isSupported, isListening, error, start, stop };
}
