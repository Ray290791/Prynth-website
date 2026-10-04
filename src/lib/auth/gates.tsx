import { type ReactNode, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User, Shield, Clock } from "lucide-react";
import { useCurrentUserState } from "./use-current-user";
import { signOut } from "./client";

export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || !user) return null;
  return <>{children}</>;
}

export function RedirectToSignIn() {
  const navigate = useNavigate();
  navigate({ to: "/" });
  return null;
}

export function UserButton() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (isPending || !user) return null;

  const initials = user.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex size-8 sm:size-9 md:size-10 items-center justify-center rounded-full bg-accent text-ink font-bold text-xs sm:text-sm shadow-sm ring-1 ring-border/50 hover:brightness-110 active:scale-95 transition-all"
        aria-label="User account menu"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-max min-w-[13.5rem] rounded-2xl border border-border/80 bg-surface/98 dark:bg-surface/98 backdrop-blur-3xl p-2 shadow-2xl shadow-black/25 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 text-sm font-semibold text-fg">
            {user.displayName || "User"}
          </div>
          <div className="px-3 pb-2 text-xs text-muted border-b border-border/60 mb-1.5 truncate max-w-[16rem]">
            {user.primaryEmail}
          </div>

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm font-medium text-fg hover:bg-surface-2 transition-colors"
          >
            <User className="mr-2.5 h-4 w-4 text-muted" />
            Dashboard
          </Link>

          <Link
            to="/history"
            onClick={() => setOpen(false)}
            className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm font-medium text-fg hover:bg-surface-2 transition-colors"
          >
            <Clock className="mr-2.5 h-4 w-4 text-muted" />
            Recently Viewed
          </Link>

          {user.primaryEmail === "prynth07@gmail.com" && (
            <Link
              to="/admin"
              search={{ tab: "orders" }}
              onClick={() => setOpen(false)}
              className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm font-medium text-fg hover:bg-surface-2 transition-colors"
            >
              <Shield className="mr-2.5 h-4 w-4 text-muted" />
              Admin
            </Link>
          )}

          <div className="border-t border-border/60 my-1 pt-1">
            <button
              type="button"
              onClick={() => void signOut("/")}
              className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            >
              <LogOut className="mr-2.5 h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
