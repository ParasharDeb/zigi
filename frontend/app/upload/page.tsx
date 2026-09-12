"use client";

import { useCallback, useRef, useState } from "react";

const DEFAULT_ENDPOINT = "http://localhost:8080/video-upload";
const DEFAULT_FIELD = "file";

type Result = {
  ok: boolean;
  status: number;
  statusText: string;
  ms: number;
  body: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoUploadTestPage() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [fieldName, setFieldName] = useState(DEFAULT_FIELD);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const selectFile = useCallback((next: File | null) => {
    setResult(null);
    setError(null);
    setProgress(0);
    setUploaded(0);
    setDuration(null);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  };

  const upload = () => {
    if (!file) return;

    const form = new FormData();
    form.append(fieldName, file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    const startedAt = performance.now();

    setUploading(true);
    setResult(null);
    setError(null);
    setProgress(0);
    setUploaded(0);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      setUploaded(event.loaded);
      setProgress(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      setResult({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        ms: Math.round(performance.now() - startedAt),
        body: xhr.responseText,
      });
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setError(
        "Request failed before a response arrived — the server is unreachable, or the browser blocked it by CORS. Check the Network tab and the backend console.",
      );
    });

    xhr.addEventListener("abort", () => {
      setUploading(false);
      setError("Upload cancelled.");
    });

    xhr.open("POST", endpoint);
    xhr.send(form);
  };

  const cancel = () => xhrRef.current?.abort();

  let prettyBody = result?.body ?? "";
  try {
    if (result?.body) prettyBody = JSON.stringify(JSON.parse(result.body), null, 2);
  } catch {
    // leave the raw text as-is — a non-JSON body is itself useful signal
  }

  return (
    <div className="min-h-full bg-zinc-50 px-6 py-12 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Video upload test</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Posts a <code className="font-mono">multipart/form-data</code> request straight at your
            Express route and shows the raw response.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Endpoint
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Field name
            <input
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-400 sm:w-32 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </section>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
          }`}
        >
          <p className="text-sm font-medium">Drop a video here, or click to choose one</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            mp4, mov, webm — anything the browser will hand over
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {file && (
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {formatBytes(file.size)} · {file.type || "unknown type"} ·{" "}
                  {duration === null ? "…" : formatDuration(duration)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectFile(null);
                }}
                className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                clear
              </button>
            </div>

            {previewUrl && (
              <video
                src={previewUrl}
                controls
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                className="mt-3 max-h-64 w-full rounded-lg bg-black"
              />
            )}
          </section>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={upload}
            disabled={!file || uploading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {uploading ? `Uploading… ${progress}%` : "Upload"}
          </button>
          {uploading && (
            <button
              onClick={cancel}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
          )}
        </div>
        {(uploading || progress > 0) && file && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-blue-600 transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {formatBytes(uploaded)} / {formatBytes(file.size)}
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {result && (
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="font-mono text-xs">
              <span
                className={
                  result.ok
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {result.status} {result.statusText}
              </span>{" "}
              <span className="text-zinc-500 dark:text-zinc-400">· {result.ms} ms</span>
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 p-3 font-mono text-xs whitespace-pre-wrap dark:bg-zinc-900">
              {prettyBody || "(empty body)"}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}
