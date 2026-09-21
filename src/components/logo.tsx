import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display font-bold lowercase tracking-tight text-fg",
        className,
      )}
    >
      p<span className="text-accent">r</span>ynth
      <span className="text-accent">!</span>
    </span>
  );
}

export function LogoLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="prynth! home"
      className={cn(
        "inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        className,
      )}
    >
      <Wordmark className="text-[1.65rem] leading-none md:text-2xl" />
    </Link>
  );
}
