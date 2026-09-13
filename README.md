# Una aventura espacial

A static reading and maths game for children. Player-facing text is Spanish; source code is English. The first reading adventure targets independently reading seven-year-olds, with comprehension rather than decoding exercises.

## Run

Requires Node.js 22.12+ (or a newer supported LTS release).

```sh
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

- `/index.html`: the adventure itself. Start or continue over the full-screen artwork; **Practicar mates** is a tile beside the first chapter.
- `/practice.html`: the existing seven maths levels, robot collection, family information, and music credits.
- `/games/robot-lab.html?level=1`: the maths-only robot factory. Levels are numbered 1–7.
- `/games/adventure.html`: retained direct entry to the same adventure. The normal home/start/play flow stays on `/index.html` without another landing page.

The first chapter is **Una voz entre las estrellas**: build Chispa and repair the radio to talk to your parents.

## Chapter authoring

- `npm run chapter:check` — type-check and validate registered chapters, drafts, catalogue consistency and local artwork files. Runs in CI.
- `npm run chapter:new -- brote` — create a typed, unpublished draft for an existing catalogue entry; never overwrite or register it automatically.
- `npm run dev`, then open `/?chapter-preview=chispa-radio&scene=radio-cables` — jump to a scene with isolated test progress. The preview never touches real saves or preferences and is excluded from production.

See the [authoring guide](src/adventure/README.md#authoring-tools) for preview controls and the explicit publishing workflow. Validation does not replace content review or save-migration decisions.

## Reading adventure

The chapter combines short Spanish passages with one uninterrupted robot-building exercise. All six maths operations and piece placements must be completed before the story resumes; there are no reading interruptions after the head/body or arms. It includes a comprehension question, six maths operations, a short cable-rotation radio repair, and a three-event sequencing activity. The current story is linear and authored through the chapter-script compiler. Each scene shows its complete passage over full-screen artwork, with all choices underneath. There are no paragraph-by-paragraph transitions or rereading dialogs. Wrong reading answers turn red and briefly shake; correct answers turn green with a checkmark. Neither shows hint or explanation panels. Reduced-motion preferences disable shaking, and screen readers receive concise answer-status announcements. An optional final prompt invites the child to retell the story aloud or on paper; the game does not assess handwriting or oral fluency.

**Empezar aventura** opens a two-step popup over the home screen: enter a name or nickname → **Siguiente** → choose **Niño** or **Niña** → **Empezar**. There are no tabs, difficulty selectors or extra questions. A name and character are required for a new adventure; existing unnamed saves still continue normally, using “piloto” in dialogue. Names are limited to 24 characters and never sent to a server. New campaigns use small additions/subtractions; existing chapter/profile difficulty is preserved without asking again. **Continuar aventura** resumes directly. **Reiniciar capítulo** opens the same popup with saved details and an explicit replacement warning. Only the final **Empezar** saves the profile and replaces that chapter's run. Going back preserves the draft; cancelling or pressing Escape discards it without changing the campaign or selected chapter. Returning home also preserves in-memory progress when storage is blocked.

The home screen includes seven chapter cards, one per robot, with Chispa first, plus a **Practicar mates** tile alongside Chispa. Practice is always available and does not count toward chapter completion. Only Chispa has playable content. Locked cards show a chapter number and padlock, without titles or robot identities. **Terminar capítulo** on the final reading screen records completion and reveals Brote as **Próximamente**, still disabled until its chapter is written. General home navigation never records completion. Completed chapters can be replayed without losing unlocks, and each started chapter has an independent resumable save. The catalogue can grow as the planned syllabus is authored; there are no fake playable chapters.

The user-supplied Gemini cockpit artwork fills the viewport. `<picture>` selects separate portrait/landscape compositions for the chosen character. Local WebP derivatives (roughly 116–190 KB each) load instead of the preserved JPEG originals. The cockpit is currently the establishing backdrop throughout the chapter; dedicated workshop and repaired-radio artwork has not been supplied yet. The original SVG scene prototypes are no longer displayed in the adventure.

Completing all six maths problems and placing every piece reveals **Chispa**, the mechanic. She explains how she repairs machines and asks for help reconnecting the radio cables. **Arreglar la radio.** opens the cable game directly, without the former key search or greeting. The introduction survives reload/home/continue and leaves maths practice unchanged. Her user-supplied workshop portrait uses separate landscape/mobile WebP images (roughly 186–197 KB) configured in the script's `robotIntroduction.artwork`; JPEG originals are preserved. Her existing SVG remains the image-failure fallback. The title and passage remain readable HTML, not text baked into an image.

After greeting Chispa, **El circuito de la radio** opens a 4 × 4 cable puzzle that repairs the radio. Drag a cable right/down to rotate clockwise or left/up to rotate counterclockwise; it previews the turn and snaps on release. Tapping, clicking, or Enter/Space rotates clockwise. Cable pieces stay in their grid cells. Chispa disconnects the battery before work. Join the connectors from battery to radio; a fixed return cable completes the circuit. Only the completed circuit lights up, when Chispa reconnects the battery. The story introduces **cable**, **conector**, **circuito**, **batería** and **corriente eléctrica** in context. **Ayuda** highlights and focuses one useful piece without solving it; **Saltar** keeps the activity optional. There are no branches, timers, move limits or penalties. Rotations survive home/continue and reload, and completion waits for **Continuar**. Reduced motion disables the radio-light transition.

The original **Agua para el viaje** water-pipe puzzle remains available in `src/adventure/chapters/interludes.ts` for a later chapter. Its blue pipes, water feedback and reservoir are preserved through the shared component's `water` theme, but it is not part of this chapter's scene graph.

The maths workshop uses the available viewport width and height over the darkened backdrop, rather than a centered fixed-width card. Practice uses the same expanding workshop layout. The cable puzzle also fills the activity area, with a board sized to the viewport and a readable story column. Phones stack the content and can scroll; no browser fullscreen permission is required. Robot hit areas and teaching interactions are unchanged. Story options, retries, and sequencing work by touch or keyboard without dragging. During play, **Volver atrás** rereads earlier story pages, **Volver al inicio** (house icon) opens the chapter menu, and sound remains separate. Back skips completed construction/minigames instead of replaying them; **Continuar** moves forward through visited text to the current activity. It never rewinds the save or removes unlocks. The current activity stays mounted while rereading, preserving entered answers, carrying steps, pending parts and cable rotations. Home or reload resumes the saved position, not the rereading page. Scene titles remain available to screen readers without visible chapter badges or reading dots. There are no reading modals, settings menus or fullscreen controls. Small screens, large text, and short landscape viewports can scroll rather than clipping dialogue or choices. Music remains opt-in; narrated reading is not implemented.

See [`src/adventure/README.md`](src/adventure/README.md) for the chapter format, validation, and authoring workflow.

## Play

1. Single-digit additions accept the complete answer directly: `8 + 7 = 15` releases a part without an extra carry task. Every addition displays its larger operand first, including replayed rounds.
2. For column addition with carrying, first solve a **separate intermediate calculation** for the units. In `28 + 16`, enter `14` in `8 + 6 = ?`. The `4` stays in the units result automatically; it is never requested a second time.
3. Move the numeric **1 decena** token above the tens column, then solve the tens (`2 + 1 + 1 = 4`). The result is `44`. Carrying uses numbers, not cubes or rods, and the carried amount appears above the column rather than remaining among the units. `15 + 15` likewise keeps its `0` automatically.
4. For subtraction that needs regrouping, exchange one ten for ten ones before subtracting the units. Removed blocks are crossed out.
5. A solved operation releases a part from the factory chute. Drag it onto the matching robot outline. Incorrect drops return to the conveyor.
6. Completing the robot in maths practice reveals its silhouette in the collection at the top of the practice page. Each robot has distinct head, body, antenna, and chest designs; its pieces and puzzle outlines share the same geometry.

Mouse and touch dragging are supported. As an alternative, select the part (or numeric carry token), then select its target. Buttons also work with Tab and Enter/Space; number keys enter answers.

Music and effects share one optional sound toggle, available on the home screen and during play. Music starts after user interaction and pauses when the page is hidden or character setup is open. The home screen plays **Wallpaper**, reading uses **Dream Culture**, maths uses **Carefree**, robot introductions and the final ending use **Life of Riley**, and cable/pipe games use **Cipher**. Tracks switch with the activity, not with every dialogue page. Reduced-motion preferences suppress spatial animation. No timers, lives, ads, analytics, accounts, or backend.

## Static build

```sh
npm run build
npm run preview
```

Deploy the entire `dist/` directory to any static host, including Cloudflare Pages, Netlify, or GitHub Pages. All four HTML pages are built explicitly. No SPA rewrite is required; Vite's `base: './'` and relative navigation/assets support deployment under a subdirectory. Serve the build over HTTP(S), not `file://`.

### GitHub Pages

- Repository: https://github.com/javiermolinar/aventuraespacial
- Site: https://javiermolinar.github.io/aventuraespacial/
- Pages source: **GitHub Actions** in **Settings → Pages**.
- `.github/workflows/pages.yml` runs on pushes and pull requests to `main`, and can be started manually.
- The workflow uses Node.js 22, installs with `npm ci`, validates chapters/artwork, runs unit/component tests, builds the site, and runs Chromium tests for the development-only preview and production build. CI retries browser tests twice and retains failure diagnostics for seven days.
- `tests/e2e/pages.spec.ts` also serves the built site under `/aventuraespacial/` to check all four entry pages, navigation, illustrations and music without a root-path fallback.
- Only a successful `main` build is uploaded and deployed to the `github-pages` environment. Pull requests run checks without deployment permissions. Actions are pinned to commit SHAs.
- The generated `dist/` directory is uploaded as a Pages artifact; no `gh-pages` branch, custom server, personal access token or repository secret is needed.

Fonts, music, illustrations, and effects are served locally; gameplay makes no external requests.

## Site, narrative and games

These are independent React modules, not Web Components or separate applications. The existing URLs and save schemas are unchanged.

- **Site:** `AdventureSite` owns the persistent shell, music and sound controls. `AdventureHome` renders chapter selection without importing the narrative renderer or animated games.
- **Narrative:** `useAdventureController` owns campaign state, persistence, scene transitions and the transient rereading cursor. `NarrativeView` renders authored scenes and adapts their configuration to game props. Pure chapter data and save validation remain available on the homepage so Continue and unlocks are correct immediately.
- **Games:** `BuildActivity` accepts robot/completion configuration, operations and assembly state, plus earn/place/complete callbacks. `PipePuzzle` accepts a layout, theme, rotations and rotate/continue callbacks. Neither imports chapter definitions, campaign storage or navigation. The host validates updates and decides the next scene. Shared maths widgets remain independent.
- **Shared services:** existing save stores and audio modules keep their contracts; `useSoundPreference` isolates the site's preference persistence from the campaign.

Setup and `NarrativeView` are dynamically imported on use. Construction (including Motion) and connections have separate lazy boundaries inside the narrative renderer. Static `RobotPortrait` uses the same geometry as the animated factory robot without importing Motion, including on the practice selection page. Loading/error UI keeps navigation mounted. During rereading, the live activity stays mounted, hidden and inert; Home still discards unsaved answer drafts.

`tests/e2e/loading.spec.ts` checks actual production requests: home/reading must not fetch game renderers, each resumed game loads independently, and slow/failed downloads must preserve navigation and saves.

```text
index.html                          Home HTML entry
src/main.tsx                        Home JavaScript entry
src/App.tsx                         Mounts AdventureSite with its home view
src/site/AdventureSite.tsx          Persistent shell and lazy screen boundaries
src/site/AdventureHome.tsx          Home actions and chapter selection
src/site/ChapterMenu.tsx            Chapter cards and unlock presentation
src/services/useSoundPreference.ts Shared sound preference adapter
practice.html                       Maths selection HTML entry
src/practice-main.tsx               Practice JavaScript entry
src/Practice.tsx                    Existing levels and saved collection
src/styles/site.css                 Shared controls and minimal game frame
src/styles/landing.css               Maths selection styles

games/adventure.html                Adventure HTML entry
src/adventure/main.tsx              Adventure JavaScript entry
src/adventure/useAdventureController.ts Campaign state, saves and navigation
src/adventure/NarrativeView.tsx      Scene rendering and game adapters
src/adventure/AdventureSetupDialog.tsx Two-step name/character popup
src/adventure/DialogueActions.tsx    Reading choices, comprehension and sequencing
src/adventure/chapters/interludes.ts Radio repair and reserved water interlude
src/adventure/activity-layout.css   Narrative framing around games
src/games/connections/PipePuzzle.tsx Standalone cable/water rotation interaction
src/games/connections/pipes.ts       Layout, connectivity and hints
src/games/connections/pipes.css      Self-scoped board styles
src/adventure/types.ts              Scene types and graph validation
src/adventure/chapters/chispa.ts     First chapter content
src/adventure/progress.ts           Validated, separate adventure saves
src/adventure/SceneArt.tsx           Responsive cinematic backdrop
src/adventure/RobotIntroduction.tsx Post-build profession, passage and responsive portrait
src/adventure/personalization.ts    Plain-text name tokens and name rules
src/components/TextEntryDialog.tsx  Reusable single-line/multiline typing modal
public/adventure/chapters/          Chapter artwork originals and WebP derivatives

games/robot-lab.html                 Factory HTML entry
src/games/robot-lab/main.tsx         Factory JavaScript entry
src/games/robot-lab/RobotLab.tsx     Round state and rewards
src/games/robot-lab/Factory.tsx      Falling parts and placement targets
src/games/robot-lab/BuildActivity.tsx Standalone six-piece assembly activity
src/games/robot-lab/Robot.tsx        Animated assembly illustration
src/games/robot-lab/RobotArtwork.tsx Shared SVG geometry and static portraits
src/games/robot-lab/robot-lab.css    Scoped factory styles
src/games/robot-lab/robot.css        Scoped robot illustration styles

src/components/maths/              Reusable column arithmetic and numeric carrying
src/components/maths/CarryNumbers.tsx Numeric tens/ones split and draggable carry token
src/lib/maths.ts                    Pure arithmetic helpers
src/game.ts                         Factory levels and saved progress
src/games/robot-lab/operations.ts   Stage-specific random operation generators
src/games/robot-lab/design.ts       Distinct robot design identifiers
src/components/BackgroundMusic.tsx  Opt-in local soundtrack
src/sound.ts                        Synthesized sound effects
```

To add a story activity, put its component, pure rules and self-scoped CSS under `src/games/`. Pass configuration/state in and report actions through callbacks; do not read campaign storage or navigate from the game. Add its scene type/validation and a lazy adapter in `NarrativeView`. A standalone practice route can optionally get its own HTML/TypeScript entry registered in `vite.config.ts` under `build.rollupOptions.input`. The shared maths widget is optional. Add levels as data rather than duplicating HTML.

## Persistence

**Practice:** the unchanged `little-robot-lab:v1` localStorage key stores completion counts per robot and the shared sound preference. Completed robot silhouettes remain revealed across visits on the same browser and origin. Unfinished practice puzzles restart on exit or reload. Storage failures never prevent play, but progress cannot then be retained. Clearing browser data also clears the collection.

**Adventure:** `matefaciles:campaign:v1` stores a versioned campaign: active chapter, player profile, completed chapter IDs and an independent progress record per started chapter. Each record preserves the scene/history, identity, maths stage, six generated operations, placed pieces, pending reward and cable rotations. Replaying a chapter replaces only its current run, not completion or other chapter saves.

When no campaign exists, the old `matefaciles:adventure:v1` record is validated and migrated into Chispa's record. The legacy key is left unchanged and is no longer written by the app. Existing Chispa versions migrate to version 6, retaining construction and cable progress while removing obsolete branches. A legacy ending save still requires the explicit final action to unlock the next chapter. Corrupt campaigns do not fall back to stale legacy saves. See the adventure authoring guide for individual version migrations.

Reloading preserves operands but restarts an unfinished calculation's internal carrying/borrowing steps. Reading answer states and unsubmitted sequencing selections reset on reload. Blocked storage shows a warning and allows in-memory progress and unlocking. Chapter completion never changes practice counts; practice completion never unlocks story chapters.

All practice levels are available so families can choose an appropriate difficulty. Every new practice game, practice reload, and replay generates fresh operations. Adventure reloads retain their existing operations. Completed collections are preserved.

## Operation generation

The numeric carry component derives its amount with `regroupUnits(total)` (`27` units becomes `2` tens and `7` ones), rather than hard-coding one ten. It supports larger carries for future exercises. Current exercises still use two addends, so their units-column carry is at most **1**; no new multi-addend levels are introduced. Counting blocks remain available for simple/non-carrying operations and subtraction borrowing.

`src/games/robot-lab/operations.ts` contains separate generators for small operations, place value, operations up to twenty, carrying, larger operations, advanced carrying, and mixed practice. Each constructs valid operands directly, without rejection loops or fixed fallback questions.

Levels 1, 2, 3, 5, and 7 mix equal numbers of additions and subtractions. **Level 4 is addition with carrying only; level 6 separately teaches subtraction with borrowing.** Mixed practice never includes subtraction with borrowing. Additions always show the larger operand first. Subtractions have non-negative answers. Stage-specific number ranges and exchange rules are covered by seeded tests; generators accept an optional random function for reproducible testing. The static examples on landing cards illustrate difficulty only and never populate game rounds.

## Tests

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Unit tests cover place value, carrying, regrouping, generated operation constraints, chapter graph validity, every story branch, full-robot completion guards, and persistence validation. Component tests cover fixed teaching examples such as `8 + 3`, `15 + 15`, `36 + 25`, `28 + 16`, and `23 − 7`, plus numeric carry amounts above one ten. They verify that an accepted units sum commits its units digit and proceeds directly to the tens after carrying. Browser tests solve the actual randomly generated operations across all seven stages, including correct and incorrect drops, actual touch dragging, keyboard placement, numeric carrying (including cancellation and incorrect finger drops), music, distinct silhouettes, mobile layouts, and unavailable storage.

Adventure browser tests play the entire chapter, retry reading activities, resume characters/scenes and earned pieces, confirm restarts, verify the uninterrupted home/start/continue flow, complete passages, name entry/persistence, modal focus, red/green answer states and reduced-motion handling, check storage/image failures, and inspect desktop/mobile/tablet and rotated layouts. Unit tests cover migration from pre-cinematic saves, version 1/2/3 chapter branches, water-to-radio save migration, both visual themes, pipe-layout validity, connectivity, hint progression and rotation persistence. Cable browser tests exercise real mouse/finger drags, gesture cancellation, tap and keyboard rotation, hints, solve/skip, reload and blocked storage, plus desktop, phone, tablet, short landscape and enlarged-text screenshots. Post-build introduction tests cover completion gating, personalised text, focused titles, reload/home/continue, desktop/phone/tablet/short-landscape layouts, large text, both artwork URL prefixes and image-failure fallback. Existing practice tests now enter through `/practice.html`.

Authoring tests cover draft generation/refusal, chapter metadata and artwork checks, and legal scene seeding. `tests/e2e/chapter-preview.spec.ts` checks save isolation, editable preview settings, draft discovery, phone layout, invalid links and production exclusion. Run its development cases with `npm run test:e2e -- tests/e2e/chapter-preview.spec.ts`.

Browser screenshots are written to `artifacts/` (ignored by Git). To run against the static production build: `npm run build && TEST_PRODUCTION=1 npm run test:e2e`.

## Third-party assets

The five soundtrack recordings are by Kevin MacLeod, licensed **CC BY 4.0**. Attribution for **Wallpaper**, **Dream Culture**, **Carefree**, **Life of Riley** and **Cipher** is shown on the maths practice page and included in `public/music/ATTRIBUTION.txt`, with original URLs and hashes. Recordings are served locally as 96 kbps MP3s to reduce download size. Nunito uses the SIL Open Font License; its license is distributed at `public/licenses/Nunito-OFL.txt`.

See `THIRD_PARTY_NOTICES.md` for source links. Robot illustrations and synthesized effects are generated by this project's code. The cinematic artwork was generated with Gemini and supplied by the user; runtime gameplay never calls an image service.
