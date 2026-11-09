# Development

## Project structure

This is a static React and TypeScript application built with Vite. Player-facing
text is Spanish; source code and documentation are English.

| Area | Responsibility |
| --- | --- |
| [`src/site/`](../src/site/) | Home, chapter selection, setup and the persistent adventure shell. |
| [`src/adventure/`](../src/adventure/) | Story scripts, campaign state, save validation and game adapters. |
| [`src/games/`](../src/games/) | Independent games with their own rules, UI and scoped styles. |
| [`src/components/`](../src/components/) | Shared arithmetic widgets, clocks, dialogs and audio. |
| [`public/`](../public/) | Local illustrations, music and asset licenses. |
| [`tests/e2e/`](../tests/e2e/) | Playwright gameplay, accessibility, layout and deployment checks. |

The shell owns navigation, persistence and sound preferences. Narrative adapters
pass configuration, state and callbacks to games; games do not read campaign
storage or decide which story scene comes next.

Setup prefetches the narrative renderer. Game renderers load only when needed.
Rereading keeps the current activity mounted but hidden and inert, preserving
unfinished answers and activity state. Loading and error boundaries keep navigation
available. Production loading checks live in
[`loading.spec.ts`](../tests/e2e/loading.spec.ts).

## Adding content

For stories, use the [chapter authoring guide](../src/adventure/README.md).
Catalogue order and published scene graphs are part of the save contract;
review migrations before changing them.

For a new game:

1. Put its component, pure rules and scoped CSS under `src/games/`.
2. Accept configuration and controlled state; report changes through callbacks.
3. To embed it in a story, add the scene type, validation and a lazy adapter in
   [`NarrativeView.tsx`](../src/adventure/NarrativeView.tsx). Include its state in
   save validation and the development preview.
4. For a standalone page, register an HTML entry in
   [`vite.config.ts`](../vite.config.ts) and link it from practice.

Arithmetic levels and their display order live in [`src/game.ts`](../src/game.ts);
operation generators live in
[`operations.ts`](../src/games/robot-lab/operations.ts).
Saved indices and one-based `?level=N` links stay stable when display order
changes. Add levels without reordering stored indices. Chapters can specify
their own maths level; Rayo uses three-digit subtraction without borrowing.

## Browser storage

| Key | Contents |
| --- | --- |
| `matefaciles:campaign:v1` | Profile, chapter completion and independent chapter runs. |
| `little-robot-lab:v1` | Practice robot collection and shared sound preference. |
| `space-connections-v1` | Standalone connection puzzle progress. |
| `matefaciles:adventure:v1` | Read-only legacy source, imported when no campaign exists. |

Adventure reloads retain operands, placed parts and committed minigame moves.
Unfinished calculation steps and unsubmitted reading answers reset. Replaying
a chapter replaces its run without removing completion or later unlocks.
Unavailable storage permits in-memory play; clearing browser data removes saves.
Practice and campaign completion are independent.

## Testing

The [root README](../README.md#check-and-build) lists the main checks.
`npm run test:e2e` starts Vite automatically. Production tests use
`TEST_PRODUCTION=1` and require an existing build.

The isolated chapter preview is development-only. Run its development checks
with `npm run test:e2e -- tests/e2e/chapter-preview.spec.ts`.
Browser screenshots are written to `artifacts/`; failure diagnostics are kept
in `test-results/`. Both directories are ignored by Git.

## Deployment

`npm run build` produces a static `dist/` directory. `npm run preview` serves it
locally. Deploy the whole directory over HTTP(S), including the standalone HTML
entries listed in [`vite.config.ts`](../vite.config.ts).
Relative navigation and Vite's `base: './'` support hosting under a subdirectory;
no SPA rewrite or application server is needed.

The [Pages workflow](../.github/workflows/pages.yml) validates chapters and
artwork, runs unit tests, builds, and checks both the development preview and
production site. Successful `main` builds deploy to GitHub Pages; pull requests
run checks without deployment. Set **Settings → Pages → Source** to
**GitHub Actions**.

[`pages.spec.ts`](../tests/e2e/pages.spec.ts) verifies the build under the
`/aventuraespacial/` prefix. Fonts, images, music and effects are served locally;
gameplay does not call external services.
