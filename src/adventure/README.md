# Authoring adventure chapters

Chapter content lives in `chapters/chispa.ts`. Author a `ChapterScript` and pass it to `defineChapter` from `chapter-script.ts`. The compiler generates and validates the `Chapter` consumed by `Adventure`; authors do not write scene links.

## Six phases

Scripts follow this fixed order; `middle` can be omitted:

1. `intro`: dialogue pages introducing the problem.
2. `maths`: ID, title and instruction. The engine supplies six operations and pieces; difficulty comes from player settings.
3. `robotIntroduction`: dialogue pages introducing the completed robot, with optional independent portrait/landscape artwork.
4. `middle` (optional): dialogue pages leading into the game. Omit it to go directly from the robot introduction to the game.
5. `game`: one activity configuration. Currently supports `type: 'pipes'`, `theme: 'radio' | 'water'`, a layout and introductory `text`.
6. `ending`: dialogue pages and a final retelling `prompt`.

Metadata includes `id`, `version`, `title`, `subtitle`, `summary` (the former metadata `intro`), `artwork` and `robot`. See `chispaScript` for a complete example. Each reading phase has a default `image` and non-empty `pages`. A page can override `image`.

## Dialogue pages

The same page format works in intro, robot introduction, middle and ending:

```ts
intro: {
  image: 'ship',
  pages: [
    {
      id: 'message',
      title: 'Un mensaje para ti',
      text: [
        'La radio se enciende.',
        '—Te esperamos en la estación Luna, {{name}}.',
      ],
      questions: [{
        id: 'parents-location',
        prompt: '¿Dónde te esperan tus padres?',
        options: [
          { id: 'ship', text: 'En tu nave.' },
          { id: 'station', text: 'En la estación Luna.' },
        ],
        answer: 'station',
      }],
    },
    {
      id: 'workshop',
      title: 'El taller',
      text: ['Vamos a construir a Chispa.'],
      continueLabel: 'Construir a Chispa',
    },
  ],
},
```

- No questions: show the full text and **Continuar**, optionally renamed with `continueLabel`.
- Questions: show one at a time with the complete page text. Correct answers unlock explicit continuation; nothing advances on a timer. Moving to another question resets the answer UI and saves the new position.
- Choice questions use `options` and one `answer` ID, not a `correct` flag on every option. `type: 'choice'` and `skill: 'literal'` are defaults; use `skill: 'inference'` when appropriate.
- Ordering questions use `type: 'order'`, `events: [{ id, text }]` in display order, and `answer: ['first-id', 'second-id', ...]` in chronological order.
- The final text-only ending page supplies the home action. If the last page has questions, the compiler appends a completion screen with that passage and the retelling prompt.
- All reading phases use this format, including robot introduction pages and their questions. Robot introduction artwork applies throughout that phase.
- No narrative branches in scripts. Text-only pages need no choice IDs or destinations.

Keep page IDs unique across the chapter and question IDs unique within a page. Colons are reserved for generated IDs. The first question uses the page ID; subsequent questions use `page-id:question:question-id`. A generated final completion screen uses `page-id:ending`. Inserting, removing or reordering pages/questions changes saved paths and requires a version bump or migration. IDs alone do not make structural edits save-compatible.

`defineChapter` rejects empty phases, duplicate IDs, empty passages, invalid answers/orderings, and invalid game layouts. It creates the same runtime scene types described below; do not edit generated scenes as chapter source.

`App` mounts `Adventure` with `entry="home"`, so home, character choice and story share `/index.html`. The direct `games/adventure.html` entry is retained. `chapters/catalog.ts` lists seven robot chapters in story order, independent of practice levels. Only Chispa currently supplies a playable `chapter`; other entries contain robot metadata only. Add a compiled chapter to its existing entry when ready, using the same stable ID. A future story title is optional until authored; revealed upcoming cards use the robot name.

## Chapter menu and campaign saves

`ChapterMenu.tsx` renders the home-screen chapter list. Initially only Chispa is enabled. Locked entries show only a chapter number and padlock: no future title, robot illustration or identifying accessible label is rendered. Completing the previous chapter reveals the next; if its content is missing, it shows **Próximamente** and remains disabled. Completed chapters show a completion mark and can be replayed.

The final reading action is **Terminar capítulo**. It records completion and returns home. The general **Volver al inicio** control does not complete a chapter, even when used on the ending screen. Finishing construction or skipping the optional game does not complete the chapter either. **Repetir capítulo** / **Reiniciar capítulo** opens setup; only **Comenzar de nuevo** replaces that chapter's run. Cancelling preserves progress. Replays never remove completion marks or later unlocks; an unfinished replay can be continued.

`campaign.ts` stores schema version 1 under `matefaciles:campaign:v1`: active chapter ID, player profile, ordered completed chapter IDs, and independent `AdventureProgress` records keyed by chapter ID. The old `matefaciles:adventure:v1` key is a read-only migration source, used only when no campaign exists. Old scene/build/cable migrations run through `restoreAdventure` before import and also apply to older records within a campaign. A legacy save at the ending does not imply completion; the player must press the final action. A damaged campaign shows a fresh-start notice instead of falling back to stale legacy progress.

Validation rejects unknown/unreleased/locked active chapters and records, non-prefix completion lists, malformed profiles and invalid chapter saves. Catalogue IDs and ordering are part of the save contract: append entries or supply content under existing IDs; reordering/removing entries requires an explicit migration. Storage errors preserve in-memory progress and unlocks. Practice collection and sound preferences retain their independent storage.

`Adventure` accepts a `catalog` for multiple playable chapters; its optional `chapter` override provides a single-entry catalogue for isolated chapter tests.

## Runtime scenes (generated or legacy)

- `story`: paragraphs plus unrestricted choices, each with a stable ID and destination. The full passage and all choices appear together. Branches reconnect.
- `comprehension`: paragraphs, a question and exactly one correct option. Include every clue needed in the passage, which stays visible above the options. Do not author separate hints or feedback text.
- `build`: one uninterrupted six-operation exercise. `targetPlacedParts` must be 6; all pieces must be placed before returning to reading. Do not split one robot across story stages. Maths difficulty comes from the player's settings, not the chapter or robot.
- `sequence`: paragraphs, events in their initial display order, and `correctOrder`. The complete passage remains visible above the ordering activity. Include the relevant chronology in the passage.
- `pipes`: a short passage, an authored `layout`, optional `theme` (`water` by default, or `radio`) and `next`. This optional connection puzzle belongs between complete phases, never between robot parts. Connect the fixed source and destination; **Saltar** can also advance.
- `ending`: paragraphs, a short retelling prompt and an explicit **Terminar capítulo** action that records completion and returns home. Practice is secondary, linked only from the home view. No unimplemented next-chapter button.

Keep paragraphs short, but render them together: one scene is one reading screen. Story choices are not comprehension tests. Incorrect answers receive a red border/tint and a brief shake; correct answers receive a green border/tint and checkmark. There are no visible hint or explanation panels for either result. The same treatment applies to sequencing. Reduced-motion preferences suppress shaking, and concise screen-reader-only announcements accompany the states. There is no automatic advancement or typewriter animation.

The engine saves the scene after a story transition. No paragraph cursors or rereading dialogs are needed. Persistent play controls are home and sound; the home view has start/continue, an optional new-adventure action, and the secondary maths-practice button. Navigation focuses the scene title. Long content and enlarged text can scroll rather than being clipped.

## Robot introduction after construction

The script's `robotIntroduction` phase supplies profession titles, short `text` passages (supporting `{{name}}`), optional questions, and `artwork: { landscape, portrait }`. Chispa's introduction uses the heading **Chispa**, explains her job and the radio's electrical problem, and asks the player to connect the cables. It leads directly to the radio game, without a key search or greeting scene. There are no interruptions during construction and no extra vocabulary quiz in Chispa.

After the sixth placement, scripted builds immediately enter the first introduction scene and save that position. `RobotIntroduction.tsx` focuses the name/title and renders the shared dialogue actions. Chispa waits for **Arreglar la radio.**; pages with questions wait for the correct answer and explicit continuation. Reload and home/continue retain the current introduction page/question. Legacy graph chapters can still use `chapter.robot.introduction` as the completed build state or the original completion panel when absent. Maths practice is unchanged.

The introduction uses the user-supplied workshop artwork, with separate landscape/mobile WebP derivatives and preserved JPEG originals under `public/adventure/chapters/chispa-radio/`. The chapter configures:

```ts
// Inside robotIntroduction in chapters/chispa.ts
artwork: {
  landscape: '../adventure/chapters/chispa-radio/chispa-mechanic-landscape.webp',
  portrait: '../adventure/chapters/chispa-radio/chispa-mechanic-portrait.webp',
},
```

Use a 16:9 landscape and a separately composed 9:16 portrait image of the same robot. These images are independent of the player's character. `<picture>` selects by orientation and both entry paths support subdirectory deployment. Keep the robot and important props in the upper two-thirds; reserve quiet space below for the readable HTML title and passage. Do not bake text into the images. Failed image loads show the SVG fallback and never block continuation. Robot introductions without configured artwork use the existing SVG. The supplied Chispa artwork depicts a yellow robot holding a wrench; the lavender assembly model and subsequent wrench-search story remain unchanged.

## Connection interludes

`chapters/interludes.ts` exports the current `radioInterlude` and the reserved `waterInterlude`, each without a destination. Add one to a chapter as `{ ...radioInterlude, next: 'repair' }`. Chispa's chapter includes only the radio variant. Both reuse the same 4 × 4 layout and rotation logic; the water theme, original passage, blue pipes and filling reservoir remain available for a later story.

The radio passage introduces cables and connectors, explains a circuit as a complete outward-and-return path, and names the electric current. Chispa disconnects the battery before the child works and reconnects it on completion. Copper cables, end connectors, battery and radio icons replace the water graphics. A fixed return cable is shown outside the board (the radio layout uses a left-edge source and right-edge goal). An incomplete connected prefix is only a wiring guide, explicitly labelled **sin corriente**; current highlighting and the radio light appear only after the circuit is complete. The following scene continues the repair rather than introducing another loose-cable problem. There are no flashing sparks or live-wire repair instructions.

`PipePuzzle.tsx` renders an SVG cable/pipe in each native button. Dragging right/down previews clockwise rotation; left/up previews counterclockwise rotation. Pointer capture keeps drags active outside the tile. Release snaps to quarter turns (40 CSS pixels per turn, with a 10-pixel drag threshold); pointer cancellation discards the preview. The generated click after a drag is suppressed. Tap/click and Enter/Space turn clockwise. The board disables touch scrolling during gestures, while the surrounding page remains scrollable.

`pipes.ts` defines `PipeLayout`: a square `size` (3–5), row-major straight/elbow `tiles`, `initial` rotations, a known `solution`, and fixed `source`/`goal` endpoints. Directions and clockwise quarter-turn rotations are numbered north=0, east=1, south=2, west=3. An unrotated straight pipe opens north/south; an elbow opens north/east. Endpoints name an edge tile and an outward-facing side. The shipped 4 × 4 layout has a nine-tile route and seven misaligned route tiles. Spare pipes need not connect.

Connectivity follows only reciprocal openings from the source. The authored solution validates solvability and supplies hints; winning is based on actual connectivity, not matching the solution array. **Ayuda** highlights and focuses one mismatched route tile without rotating it. In the water theme, water updates on committed turns and completion fills the reservoir. In the radio theme, only a complete circuit is powered. Both wait for **Continuar**. Reduced motion removes fill/light transitions. Sources and destinations use distinct shapes, and tile labels expose row, column, connections and water/current state to assistive technology. Theme-specific hints and labels never call radio cables pipes or water.

`AdventureProgress.pipeRotations` optionally stores rotations keyed by scene ID. `rotatePipe` commits a valid turn without mutating chapter data. Malformed rotations, unknown/non-pipe scene keys, and progress for future scenes are rejected. Missing rotations use the authored starting board. Solved boards cannot be changed, and skips do not require solving or grant robot pieces.

## Names and reusable typing

Setup includes **Escribe tu nombre**, an optional name/nickname editor. Its value is committed to the adventure only when **Comenzar** or **Comenzar de nuevo** is confirmed. Closing the modal discards its draft; cancelling replacement setup leaves the current save unchanged. Names are trimmed, repeated whitespace is collapsed, and length is capped at 24 characters. They stay in local adventure storage, never the practice collection or a network request.

Use `{{name}}` in scene text, for example `¡Hola, {{name}}!`. The renderer substitutes the saved name, or `piloto` for an unnamed adventure. Substitution returns plain text rendered through React, not HTML. Tokens work in passages, titles, questions, choices, sequencing events, construction instructions/completion and ending prompts. Keep the surrounding wording natural with either a name or the fallback.

`src/components/TextEntryDialog.tsx` is not tied to names. Mount it to open; unmount on confirm or cancel. It accepts `title`, `label`, `initialValue`, `maxLength`, `confirmLabel`, `onConfirm` and `onCancel`. Set `multiline` for future longer writing tasks. It returns trimmed text while preserving internal newlines; the caller owns validation beyond blank/length checks, story transitions and persistence. Native dialog semantics, focus containment, Escape cancellation and focus restoration are included. It does not grade answers or advance the story on its own.

## Artwork

`chapter.artwork.ship` supplies both characters and both compositions:

```ts
artwork: {
  ship: {
    boy: {
      landscape: '../adventure/chapters/chispa-radio/cockpit-boy-landscape.webp',
      portrait: '../adventure/chapters/chispa-radio/cockpit-boy-portrait.webp',
    },
    girl: {
      landscape: '../adventure/chapters/chispa-radio/cockpit-girl-landscape.webp',
      portrait: '../adventure/chapters/chispa-radio/cockpit-girl-portrait.webp',
    },
  },
}
```

Authored URLs are relative to `games/adventure.html`. `SceneArt` adjusts the leading `../` to `./` for the home entry. `BackgroundMusic` accepts the same entry-specific source prefix. This keeps image, audio and practice links correct when the whole site is hosted below a subdirectory. Add optional `artwork.workshop` and `artwork.radio` sets to give those locations their own images. Until supplied, their scenes use `ship` as a chapter establishing shot. This fallback is intentional; the image does not represent changing robot assembly state. The maths workshop illustrates actual assembled parts; the post-build introduction shows only the completed robot.

The background uses `<picture>` with `(orientation: portrait)` rather than a width breakpoint. Landscape phones use landscape art. Images are decorative; all facts needed for reading challenges must be present in the text. Keep faces and important props above the lower dialogue area. Never bake text or choices into the artwork.

### Source files

All are user-supplied Gemini JPEGs, preserved without recompression under `public/adventure/chapters/chispa-radio/`:

| Original Downloads filename | Chapter filename |
| --- | --- |
| `Gemini_Generated_Image_9jez4e9jez4e9jez.jpg` | `cockpit-boy-landscape.jpg` |
| `Gemini_Generated_Image_nnddgknnddgknndd.jpg` | `cockpit-boy-portrait.jpg` |
| `Gemini_Generated_Image_r2f2e0r2f2e0r2f2.jpg` | `cockpit-girl-landscape.jpg` |
| `Gemini_Generated_Image_pfdsbapfdsbapfds.jpg` | `cockpit-girl-portrait.jpg` |
| `Gemini_Generated_Image_9g7ii69g7ii69g7i.jpg` | `chispa-mechanic-landscape.jpg` |
| `Gemini_Generated_Image_1rh8uv1rh8uv1rh8.jpg` | `chispa-mechanic-portrait.jpg` |

Regenerate the browser derivatives with the optional `cwebp` CLI:

```sh
for image in public/adventure/chapters/chispa-radio/*-landscape.jpg; do
  cwebp -quiet -q 84 -resize 1920 0 "$image" -o "${image%.jpg}.webp"
done
for image in public/adventure/chapters/chispa-radio/*-portrait.jpg; do
  cwebp -quiet -q 84 -resize 1080 0 "$image" -o "${image%.jpg}.webp"
done
```

The build does not require `cwebp`; the derivatives are already present. No generation service is contacted by the game.

## Validation and saves

`validateChapter` checks missing/unreachable destinations, loops, empty passages, answer IDs, sequences, full-robot construction targets, completed endings and valid themes and solvable connection layouts. Every branch of Chispa's chapter is traversed in the unit tests. Content review must still check factual consistency and age-appropriate language.

Chispa version 6 removes the `middle` phase. `chispaV5Chapter()` reconstructs the old linear graph from the preserved v4 content for validation. Valid v5 saves at `tool` or `hello` resume the radio game; later histories drop those two IDs. Robot introduction, partial construction, identity and cable rotations are preserved. Versions 1–4 also migrate directly into the shorter flow, without granting pieces or replaying completed activities.

Chispa version 5 uses the six-phase script and removes the window and alternative greeting branches. `chapters/chispa-v4.ts` preserves the old graph for save validation; v1–v3 reconstruction no longer depends on current authored content. Every old save is validated before migration. A window save rejoins at the workshop; either alternative greeting rejoins at the radio game. An unfinished build keeps its pieces and pending reward; a completed build resumes the explicit robot introduction. Saves already beyond construction stay beyond it. Migration rebuilds the linear history while preserving operations, identity and pipe rotations. Invalid legacy histories are rejected, not repaired.

Keep scene/choice/event IDs stable. Chapter version 4 replaces `water-pipes` with `radio-cables`. `chispaV3Chapter` reconstructs the old water graph, and `migrateChispaV3` renames the current scene, history entries and rotation-map key. The layout is unchanged, so partial and completed boards, skipped scenes, maths, names and characters survive unchanged. Version 1/2 saves migrate through validated intermediate graphs first.

Chapter version 3 inserts the optional `water-pipes` scene after both greetings and before `repair`. `chispaV2Chapter` reconstructs the previous graph to validate saves before migration. Saves at `repair` or later retain their position, recording the optional interlude as passed in history; earlier saves encounter it normally. Version 1 saves migrate through the validated version 2 graph first.

Chapter version 2 replaces the three partial-build scenes with one complete build. `chapters/chispa-migration.ts` reconstructs the old graph to validate version 1 saves before migrating them. Unfinished robots resume `build-start` with unchanged operations, placed pieces, pending reward, name and character; the post-build conversation replays after completion. A completed old `build-legs` scene opens the full-robot completion screen. Saves at `repair`, `recap` or `ending` keep their current scene, with removed build IDs filtered from history. No migration grants pieces or requires repeating maths. Saves predating character selection or naming default to `character: 'boy'` and `playerName: ''` only when those fields are absent. Saves from paragraph-based reading discard the obsolete `beat` field and open the full current scene. History, maths stage, operands, earned pieces and placed parts are preserved. Invalid characters, malformed/oversized names and invalid scene/construction states are rejected. Structural changes that invalidate saves need an explicit migration or a chapter-version bump; incompatible saves show a fresh-start notice.

Returning home changes only the view, not the progress, so continue also works when localStorage is blocked. Starting a new adventure requires a separate confirmation in character setup; cancelling never replaces the current game. The home screen plays **Wallpaper** and has its own sound toggle. Music pauses during setup and when the browser tab is hidden. Playback remains opt-in and requires an interaction on a fresh visit. Reading uses **Dream Culture**, maths uses **Carefree**, robot introductions and the final ending use **Life of Riley**, and cable/pipe puzzles use **Cipher**. `music.ts` selects a track by activity; `BackgroundMusic` reacts to source changes without restarting the track between ordinary reading pages. All tracks are local, quiet loops with credits on the practice page and in `public/music/ATTRIBUTION.txt`. An unfinished calculation resumes with the same operands but restarts its internal carrying/borrowing steps. Reading answer states and unsubmitted sequence selections are not saved. The practice collection remains independent.

## Check changes

```sh
npm test
npm run build
TEST_PRODUCTION=1 npm run test:e2e
```

`campaign.test.ts`, `ChapterMenu.test.tsx` and `tests/e2e/chapters.spec.ts` test hidden locked content, explicit completion, upcoming chapters, independent chapter runs, replay confirmation, migration and storage failures. Menu screenshots are saved as `artifacts/chapters-*.png`.

`chapter-script.test.ts` tests compilation, optional/multiple questions, phase ordering and authoring errors. `Dialogue.test.tsx` tests question rendering, explicit advancement, resume and robot-introduction questions. Migration tests traverse every legacy branch and construction state.

Browser tests play the full chapter and capture `artifacts/cinematic-*.png`. Inspect desktop, portrait phone, tablet and short landscape screenshots. Test the chapter menu, in-place start/continue flow, both characters, name entry/cancellation and persistence, modal keyboard focus, full passages with immediately available choices, legacy-save migration, red/green answer states, repeatable shakes with reduced-motion support, ready parts, uninterrupted construction through pieces two/four and old partial-build migration, large text, root/subdirectory asset paths, storage failures and missing images. Do not add new chapter links before the chapter is playable.
