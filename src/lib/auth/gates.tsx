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
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-max min-w-[12rem] rounded-md border border-border bg-bg p-2 shadow-md">
          <div className="px-2 py-1.5 text-sm font-medium">
            {user.displayName || "User"}
          </div>
          <div className="px-2 pb-2 text-xs text-muted-foreground border-b border-border mb-1">
            {user.primaryEmail}
          </div>

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2"
          >
            <User className="mr-2 h-4 w-4" />
            Dashboard
          </Link>

          <Link
            to="/history"
            onClick={() => setOpen(false)}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2"
          >
            <Clock className="mr-2 h-4 w-4" />
            Continue Shopping For
          </Link>

          {user.primaryEmail === "prynth07@gmail.com" && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2"
            >
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </Link>
          )}

          <button
            onClick={() => void signOut("/")}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-surface-2"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
