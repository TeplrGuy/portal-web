# Frontend Rules for portal-web

These rules apply when changing the portal UI, browser behavior, or the Express layer that supports the UI.

## Current stack
- Node + Express serves the app shell.
- Static assets live in `src/public`.
- `src/server.js` exposes `/config`, `/api/health`, `/api/orders`, and `/api/orders/:orderId`.

## UI implementation rules
- Treat the current UI as the baseline demo surface; enhance it issue by issue.
- Prefer incremental enhancement over wholesale rewrites.
- Keep the portal easy to narrate in demos: environment, build, health, and evidence links should stay visible unless an issue says otherwise.
- Preserve the create-order and track-order flow as the primary journey.

## HTML rules
- Keep markup semantic and readable.
- Use stable IDs for interactive elements that tests and demos rely on.
- Preserve form labels and straightforward task language for non-technical demo audiences.

## CSS rules
- Keep the visual style consistent with the current dark dashboard aesthetic.
- Prefer extending existing variables and card/layout patterns before introducing new design systems.
- Avoid fragile layout hacks that make screenshots inconsistent across screen sizes.

## Browser JavaScript rules
- Keep DOM updates explicit and localized.
- Reuse existing helpers like `getJson`, `pretty`, and `renderLinks` when extending behavior.
- Handle async UI states visibly: loading, success, and error states should be obvious.
- Preserve correlation ID visibility in the UI when requests are made.

## Server-side UI support rules
- `src/server.js` may shape browser-safe proxy behavior, but it should not absorb gateway business logic.
- New portal endpoints should exist only when the browser cannot safely or directly perform the needed call.
- Keep repo links and demo evidence links intentional and traceable to the GitHub storyline.

## Testing and evidence
- UI changes should be covered by Playwright when the user-visible flow changes.
- Completed UI issues should include a screenshot artifact in the issue or linked PR.
