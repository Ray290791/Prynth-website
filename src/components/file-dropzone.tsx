import { FileUp, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ACCEPT = ".stl,.3mf,.obj";

export function FileDropzone({
  file,
  onFile,
  hint = "STL, 3MF, or OBJ. Max 50 MB.",
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function pick(list: FileList | null) {
    const next = list?.[0];
    if (!next) return;
    const ext = next.name.split(".").pop()?.toLowerCase();
    if (!ext || !["stl", "3mf", "obj"].includes(ext)) return;
    if (next.size > 50 * 1024 * 1024) return;
    onFile(next);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
      />
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-surface-2"
            aria-label="Remove file"
            onClick={() => {
              onFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors duration-150",
            over
              ? "border-accent bg-accent-soft"
              : "border-border bg-surface hover:border-accent/50",
          )}
        >
          <FileUp className="size-6 text-accent" strokeWidth={1.75} />
          <span className="text-sm font-medium">Drop your model here</span>
          <span className="text-xs text-muted">{hint}</span>
        </button>
      )}
    </div>
  );
}
