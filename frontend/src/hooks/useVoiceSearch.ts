"use client";

import * as React from "react";

type VoiceState = "idle" | "listening" | "processing";

type SpeechResult = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
};

type SpeechResultEvent = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
};

type SpeechErrorEvent = Event & { error: string };

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function recognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. You can still type your search.";
    case "audio-capture":
      return "No microphone is available. You can still type your search.";
    case "no-speech":
      return "No speech was detected. Please try again.";
    case "network":
      return "Voice recognition is unavailable right now. Please type your search.";
    default:
      return "Voice search could not start. Please try again or type your search.";
  }
}

export function useVoiceSearch({
  onInterim,
  onTranscript,
}: {
  onInterim: (text: string) => void;
  onTranscript: (text: string) => void;
}) {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [state, setState] = React.useState<VoiceState>("idle");
  const [error, setError] = React.useState("");
  const recognitionRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const processingRef = React.useRef(false);
  const idleTimerRef = React.useRef<number | null>(null);
  const onInterimRef = React.useRef(onInterim);
  const onTranscriptRef = React.useRef(onTranscript);

  React.useEffect(() => {
    onInterimRef.current = onInterim;
    onTranscriptRef.current = onTranscript;
  }, [onInterim, onTranscript]);

  React.useEffect(() => {
    setSupported(Boolean(recognitionConstructor()));
    return () => {
      recognitionRef.current?.abort();
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = React.useCallback(() => {
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setSupported(false);
      return;
    }

    recognitionRef.current?.abort();
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    processingRef.current = false;
    setError("");

    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || navigator.language || "en";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setState("listening");
    recognition.onresult = (event) => {
      let transcript = "";
      let final = false;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
        final ||= event.results[index].isFinal;
      }
      transcript = transcript.trim();
      if (!transcript) return;
      onInterimRef.current(transcript);
      if (final) {
        processingRef.current = true;
        setState("processing");
        onTranscriptRef.current(transcript);
        recognition.stop();
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setError(errorMessage(event.error));
      processingRef.current = false;
      setState("idle");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (processingRef.current) {
        idleTimerRef.current = window.setTimeout(() => {
          processingRef.current = false;
          setState("idle");
        }, 600);
      } else {
        setState("idle");
      }
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setState("idle");
      setError("Voice search could not start. Please try again or type your search.");
    }
  }, []);

  const reset = React.useCallback(() => {
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    processingRef.current = false;
    setState("idle");
    setError("");
  }, []);

  return { supported, state, error, start, stop, reset };
}
