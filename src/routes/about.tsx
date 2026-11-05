import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About and limits — Late Hague" },
      {
        name: "description",
        content:
          "What Late Hague does, who it is for, where the data comes from and what it cannot tell you about study and food places in The Hague.",
      },
      { property: "og:title", content: "About and limits — Late Hague" },
      {
        property: "og:description",
        content: "How Late Hague uses OpenStreetMap opening hours, and the limits of that data.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-foreground/90">{children}</div>
    </section>
  );
}

function About() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-12">
      <Button asChild variant="ghost" size="touch" className="-ml-2">
        <Link to="/">
          <ArrowLeft aria-hidden /> Back to places
        </Link>
      </Button>
      <h1 className="text-3xl font-bold sm:text-4xl">About and limits</h1>

      <Block title="What this app does">
        <p>
          Late Hague helps students of De Haagse Hogeschool and other higher education students in The Hague find study
          places and food spots that are open at the time they want — in the evening, at night or at the weekend, when
          the university library is closed.
        </p>
        <p>
          Pick a day and time, and the app sorts places into <strong>Open then</strong>, <strong>Closed then</strong>{" "}
          and <strong>Hours unknown</strong>. It is not made for tourists, and it does not replace asking a place if you
          are allowed to study there.
        </p>
      </Block>

      <Block title="Where the data comes from">
        <p>
          All places and opening hours come from{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-link">
            OpenStreetMap
          </a>
          , a map made by volunteers. The app loads it live and keeps a copy on your phone for one hour.
          If the live servers are unavailable, it shows a saved copy from 5 Nov 2026 and says so.
        </p>
        <p>
          The Haagse Hogeschool library hours come from the{" "}
          <a
            href="https://www.dehaagsehogeschool.nl/over-de-haagse/faciliteiten/bibliotheek/over-de-bibliotheek/openingstijden-en-contactgegevens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            official university page
          </a>
          .
        </p>
      </Block>

      <Block title="What it gets wrong">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Only part of the places in OpenStreetMap have opening hours. Places without hours are shown as unknown, never
            as open.
          </li>
          <li>Some real places are missing, and some hours are old or wrong.</li>
          <li>It does not know if a place allows studying, or how busy it is.</li>
          <li>Holiday hours and one-off closures are often not in the data.</li>
        </ul>
      </Block>

      <Block title="Who it does not serve">
        <ul className="list-disc space-y-2 pl-5">
          <li>People without a smartphone or internet connection.</li>
          <li>People who need accessibility information — the app does not provide it.</li>
        </ul>
      </Block>

      <Block title="Privacy">
        <p>
          No login, no accounts, no tracking and no ads. If you press <strong>Near me</strong>, your location is used
          only on your device to show distances. It is never stored or sent anywhere.
        </p>
      </Block>

      <section className="rounded-2xl border border-primary/40 bg-primary-soft p-5">
        <h2 className="text-xl font-semibold">Found wrong hours?</h2>
        <p className="mt-1 text-foreground/90">
          You can fix them yourself on OpenStreetMap. Your change helps every student using this app.
        </p>
        <Button asChild variant="night" size="touch" className="mt-3">
          <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer">
            <Pencil aria-hidden /> Report wrong hours <ExternalLink aria-hidden />
          </a>
        </Button>
      </section>
    </div>
  );
}
