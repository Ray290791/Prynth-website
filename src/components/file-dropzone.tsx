import { FileUp, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPT = ".stl,.3mf,.obj";

export function FileDropzone({
  file,
  files,
  onFile,
  onFiles,
  multiple = false,
  hint = "STL, 3MF, or OBJ mesh files. Max 25 MB per file.",
}: {
  file?: File | null;
  files?: File[];
  onFile?: (file: File | null) => void;
  onFiles?: (files: File[]) => void;
  multiple?: boolean;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function pick(list: FileList | null) {
    if (!list || list.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext === "f3d" || ext === "step" || ext === "stp") {
        toast.info(
          `"${f.name}" is a CAD archive (.step, .f3d). Please use the 'Describe your idea' tab for CAD models.`
        );
        continue;
      }
      if (!ext || !["stl", "3mf", "obj"].includes(ext)) {
        toast.error(`"${f.name}" is unsupported. Please upload STL, 3MF, or OBJ mesh.`);
        continue;
      }
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 25 MB. Please optimize mesh.`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    if (multiple && onFiles) {
      onFiles(validFiles);
      toast.success(`${validFiles.length} file(s) added to project workspace`);
    } else if (onFile) {
      onFile(validFiles[0]);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
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
              onFile?.(null);
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
