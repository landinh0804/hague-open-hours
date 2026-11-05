import { Link } from "@tanstack/react-router";
import { Info, MoonStar } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[1000] border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex min-h-12 items-center gap-2.5" aria-label="Late Hague home">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <MoonStar className="size-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            Late <span className="text-primary">Hague</span>
          </span>
        </Link>
        <nav aria-label="Main">
          <Link
            to="/about"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-muted-foreground hover:bg-surface hover:text-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Info className="size-5" aria-hidden /> About &amp; limits
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Data:{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-link">
            OpenStreetMap contributors
          </a>
        </p>
        <p>No login · no tracking · no ads · your location never leaves your device</p>
      </div>
    </footer>
  );
}
