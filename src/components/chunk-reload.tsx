"use client";

import { useEffect } from "react";

// When a new version is deployed, an already-open tab is running an old
// client bundle whose hashed chunk filenames no longer exist. Clicking a
// link then fails to load a chunk and Next shows a hard error. This listener
// detects that specific failure and reloads the page once to pull the current
// build, so navigation self-heals across deploys instead of dead-ending.
const CHUNK_ERROR_PATTERNS = [
  "ChunkLoadError",
  "Loading chunk",
  "Loading CSS chunk",
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
];

const RELOAD_GUARD_KEY = "bgb-chunk-reloaded-at";

function looksLikeChunkError(message: string | undefined): boolean {
  if (!message) return false;
  return CHUNK_ERROR_PATTERNS.some((p) => message.includes(p));
}

function reloadOnce() {
  // Guard against reload loops: only auto-reload if we haven't done so in the
  // last 10 seconds. If the error persists after a fresh load, it isn't skew.
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — fall through and reload anyway.
  }
  window.location.reload();
}

export function ChunkReload() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (looksLikeChunkError(event.message) || looksLikeChunkError(event.error?.message)) {
        reloadOnce();
      }
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = typeof reason === "string" ? reason : reason?.message;
      if (looksLikeChunkError(message)) reloadOnce();
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
