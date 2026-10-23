import React, { useState, useId } from "react";
import { X } from "lucide-react";

export function TagInput({ 
  tags, 
  setTags, 
  placeholder = "Type and press Enter...",
  className = "",
  suggestions = [],
  isColor = false
}: { 
  tags: string[]; 
  setTags: (tags: string[]) => void; 
  placeholder?: string;
  className?: string;
  suggestions?: string[];
  isColor?: boolean;
}) {
  const [input, setInput] = useState("");
  const datalistId = useId();
  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          list={suggestions.length > 0 ? datalistId : undefined}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const newTag = input.trim();
              if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
                setInput("");
              }
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        {suggestions.length > 0 && (
          <datalist id={datalistId}>
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        )}
        <button
          type="button"
          onClick={() => {
            const newTag = input.trim();
            if (newTag && !tags.includes(newTag)) {
              setTags([...tags, newTag]);
              setInput("");
            }
          }}
          className="rounded-xl bg-surface-2/80 px-5 py-2.5 text-sm font-medium border border-border/50 hover:bg-surface-3 transition-colors active:scale-95"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((t, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-accent/10 pl-3 pr-1 py-1 text-xs font-medium text-accent border border-accent/20">
              {isColor && (
                <span 
                  className="w-2.5 h-2.5 rounded-full border border-black/20 inline-block mr-1"
                  style={{ backgroundColor: t.toLowerCase().replace(/\s/g, "") }} 
                />
              )}
              {t}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTags(tags.filter((_, idx) => idx !== i));
                }}
                className="ml-1 flex size-5 items-center justify-center rounded-full hover:bg-accent/20 transition-colors"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
