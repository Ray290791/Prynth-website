import { Link } from "@tanstack/react-router";
import { PackageX } from "lucide-react";

export function NotFoundComponent() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-surface-2 p-6 text-muted">
        <PackageX className="size-12" strokeWidth={1.5} />
      </div>
      <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 text-muted">
        We couldn't find the page you're looking for. It might have been moved or deleted.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link
          to="/"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90"
        >
          Go to Homepage
        </Link>
        <Link
          to="/shop"
          className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          Browse Shop
        </Link>
      </div>
    </div>
  );
}
