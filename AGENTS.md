<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (Late Hague)

- Place data is fetched in the browser (`src/lib/places.ts`): one-hour localStorage cache → each Overpass endpoint in order with a per-endpoint timeout → bundled snapshot `src/data/places_snapshot.json` (lazy-imported, never cached, labelled as Saved). No backend, so no user data can leave the device.
- Open/closed logic lives only in `src/lib/hours.ts` (opening_hours package); missing, unreadable or uncertain hours must map to "unknown", never "open" — covered by `src/test/hours.test.ts`.
- The Leaflet map is lazy-loaded behind `<ClientOnly>` because Leaflet touches `window` at import time.
- Fonts are self-hosted via @fontsource (no Google Fonts) so the app makes no third-party requests beyond OSM data/tiles.
