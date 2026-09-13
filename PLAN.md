# Una aventura espacial — product and implementation plan

## 1. Direction

A Spanish-language reading and maths adventure. The child lands on the wrong planet while returning from school and builds a robot crew to help them get home.

- **Game name:** Una aventura espacial.
- **First chapter:** Una voz entre las estrellas — Chispa y la radio.
- **One chapter per robot.** Each robot has a profession, a mathematical learning goal and related vocabulary.
- **Target scope:** 12 chapters, delivered incrementally. This is a proposed syllabus breakdown, not a commitment to implement all chapters immediately.
- **Reuse interactions:** four adventure minigames, **in addition to** the existing maths-based robot construction. Not a different game for every chapter.
- No timers, lives or penalties. Sound remains optional. Touch and keyboard must work; dragging has an alternative wherever practical.

## 2. What already exists

### Chapter authoring

`src/adventure/chapter-script.ts` compiles typed chapter scripts into the runtime scene graph. Authors write ordered phases, not `next` links:

1. Intro dialogue.
2. Maths and complete robot construction.
3. Robot introduction.
4. Optional middle dialogue.
5. An adventure game.
6. Ending dialogue, optional recap questions and chapter closure.

The shared dialogue format contains a stable page ID, title, text, optional questions and an optional continuation label. Choice and ordering questions are supported. Multiple questions retain the page's full passage and require explicit continuation.

### Chispa

`src/adventure/chapters/chispa.ts` is the only playable chapter. Its current sequence is:

- **Un mensaje para ti:** the child has landed on an unknown planet; their parents tell them to return to estación Luna; the radio breaks. A comprehension question checks the destination.
- **Mejor en compañía:** the onboard computer detects an electrical problem and proposes building Chispa.
- **Hora de trabajar:** the child enters the workshop and learns how to make and place robot parts.
- **Una nueva compañera:** six calculations and all six robot parts, without story interruptions.
- **Chispa:** the mechanic introduces herself and asks for help reconnecting the radio cables.
- **Arreglar la radio:** opens the cable game directly. The former key-search and greeting scenes have been removed.
- **Ahora sí nos escuchan:** communication with the parents is restored.
- **Una historia para contar:** order the events of the adventure.
- **Ya no viajas a solas:** final reading and return home.

Chapter version 6 migrates supported older saves without losing calculations, parts, identity or cable rotations.

**Agreed learning goal:** Chispa teaches **sumas con llevadas**. This is not yet enforced by chapter configuration: the current engine still uses the player's chosen maths level. Aligning her default exercises with that goal remains work to do.

### Presentation and audio

- The maths workshop, maths practice and cable game use the available viewport rather than narrow centered containers. Small screens can scroll.
- The home screen and gameplay have sound controls.
- Local music changes by context: Wallpaper for home, Dream Culture for reading, Carefree for maths, Life of Riley for robot introductions/final closure, and Cipher for cable/pipe games.
- Music is quiet, opt-in, and pauses during setup or when the tab is hidden. A fresh visit requires an interaction before playback.
- Track attribution and source details are distributed locally and shown on the practice page.

### Chapter menu and campaign progress — implemented

The home screen now contains seven robot chapter cards, Chispa first. Locked entries hide titles and robot identities; explicit completion reveals the next entry, with unwritten chapters marked **Próximamente**. Replays preserve unlocks. `src/adventure/campaign.ts` maintains independent chapter records and migrates the old single-chapter save into a versioned campaign. Tests cover completion, replay, multi-chapter selection, migration and unavailable storage.

### Current limitations
- Only Chispa has authored story content.
- Maths currently covers addition and subtraction below 100, not the complete syllabus below.
- The connection puzzle supports radio and water presentations. Packing, clock and money games do not exist yet.

## 3. Home screen and chapter progression

### Agreed behaviour

Add a chapter menu to the main screen, with one entry per robot.

| State | What the player sees | Action |
| --- | --- | --- |
| Locked | Chapter number and padlock; no title or robot identity | Disabled |
| Unlocked, playable | Chapter title and robot | Start or continue |
| Unlocked, not yet written | Revealed title/robot and **Próximamente** | Disabled |
| Completed | Revealed title/robot and completion mark | Replay |

- Chapter 1 starts unlocked.
- Completing a chapter reveals the next chapter only.
- Unlock eligibility and content availability are separate: revealing an unwritten chapter does not make it playable.
- Locked titles and robot names must not leak through accessible labels or image descriptions.
- Replaying or restarting a chapter must not erase previously earned unlocks.
- Keep maths practice available separately. Practice achievements do not unlock story chapters.

### Completion and persistence

Implemented completion rule: **Terminar capítulo** records completion when the child presses the dedicated final chapter action after the ending, **not** when they finish assembling the robot or use the general home button. Preserve the existing optional game skip; chapter completion is not a mastery certificate.

Implement a versioned campaign save containing:

- Completed chapter IDs.
- A resumable save for each started chapter.
- The active/last-played chapter.
- The player profile and relevant settings.

Migrate the existing single-chapter save into Chispa's record. Preserve operations, pending rewards, parts, name, character and puzzle state. A legacy save at the ending can still finish through the final action; do not invent completion history that was never stored.

Unavailable storage must still allow in-memory play, completion and unlocking for the current session. Keep the practice collection independent.

## 4. Syllabus and robot themes

The themes below are proposals. **Chispa as a mechanic teaching carrying addition is agreed.** The other professions, new names and final chapter order remain adjustable.

| Chapter | Robot | Profession/theme | Main maths goal | Vocabulary examples |
| --- | --- | --- | --- | --- |
| 1 | Chispa | Mechanics | Addition with carrying | herramienta, cable, conector, circuito, corriente |
| 2 | Brote | Gardening | Count, read, write and decompose numbers to 1,000; hundreds, tens and units | semilla, raíz, tallo, regar, cosecha |
| 3 | Rayo | Deliveries | Compare/order quantities and complete number sequences | paquete, dirección, ruta, destino, entrega |
| 4 | Tuerca | Construction | Subtraction with borrowing | plano, ladrillo, viga, cimiento, construir |
| 5 | Burbuja | Cooking | Doubles and halves | ingrediente, receta, porción, mezclar, repartir |
| 6 | Cosmo | Astronomy | Multiplication as repeated addition | telescopio, planeta, órbita, estrella, constelación |
| 7 | Pixel | Electronics | Multiplication table of 2 | pantalla, teclado, sensor, batería, señal |
| 8 | Pétalo* | Floristry | Tables of 5 and 10 | ramo, pétalo, florero, agrupar, encargo |
| 9 | Tic* | Railways | Clock reading: full hour, half past, quarter past | andén, horario, salida, llegada, vagón |
| 10 | Cora* | Commerce | Euro notes/coins, paying and simple change | precio, cambio, compra, venta, ahorrar |
| 11 | Puntada* | Sewing | Length and centimetres | tela, aguja, hilo, medir, cinta métrica |
| 12 | Eco* | Recycling | Kilograms and litres | envase, recipiente, báscula, capacidad, reutilizar |

\*Five proposed new robots, alongside the seven existing designs.

### Teaching principles

- Use everyday problem solving and reasoning throughout the chapters, not only in a separate final chapter.
- Introduce roughly **3–5 important vocabulary words per chapter**, explain them through actions/context, and reuse them in dialogue, the game and the ending.
- Reading questions must be answerable from the passage, not depend on decorative artwork or unexplained vocabulary.
- A chapter introduces a skill. Six calculations alone cannot establish mastery or memorise multiplication tables; repeatable practice is necessary.
- Include short prerequisite reminders and revisit earlier skills. With Chispa first, review tens/units before carrying; Brote can later extend numeration to 1,000.
- Review the final order for prerequisites before creating the full campaign. Narrative unlock order should not force children into unsupported exercises.
- A themed puzzle does not automatically teach the listed mathematics. Its quantities, instructions and success condition must actually exercise the learning goal.

### Word problems with numeric answers

**Agreed addition:** chapters should include contextual maths problems where the child enters a number, ranging from a single operation to several reasoning steps. These are a shared dialogue/activity capability, **not a fifth adventure minigame**.

The current dialogue engine supports choice and ordering questions only. Add a numeric-answer question type with:

- A complete, readable problem statement.
- An explicit final question and unit where relevant.
- A numeric entry field, usable with the keyboard and an on-screen number pad.
- A **Comprobar** action and the existing consistent correct/incorrect feedback.
- Optional space for intermediate calculations, available without hiding the problem.
- Optional authored guiding questions, revealed when the child requests help.
- Explicit continuation after a correct final answer, rather than advancing as soon as a digit is entered.

#### Example: one-step addition

> María tiene 5 manzanas y Juan tiene 3 naranjas. ¿Cuántas frutas tienen entre los dos?

Expected answer: **8 frutas**. The child enters `8`; the unit is supplied by the interface, not typed.

#### Example: a multi-step problem

> Antonio tiene 6 manzanas. Juan tiene la mitad de manzanas que Antonio. María tiene el doble de la cantidad que tienen Antonio y Juan juntos. ¿Cuántas manzanas tienen entre los tres?

One possible solution:

1. Juan: `6 ÷ 2 = 3`.
2. Antonio and Juan together: `6 + 3 = 9`.
3. María: `9 × 2 = 18`.
4. All three together: `6 + 3 + 18 = 27`.

Expected final answer: **27 manzanas**. If the final question instead asks only how many María has, the answer is **18**. Every authored problem must identify the requested quantity explicitly.

#### Intermediate work and progression

- Start with direct one-step addition/subtraction using familiar quantities.
- Introduce doubles, halves and repeated addition after their prerequisite concepts.
- Progress to two-step and then longer problems. Introduce the vocabulary and sentence structure separately from the arithmetic difficulty where possible.
- Keep intermediate work optional: a child who can reason mentally may enter the final answer directly.
- Do not require one particular calculation sequence when another valid strategy reaches the same answer.
- Distinguish a free working area from authored, checked steps. The first version can offer simple number/operation rows and optional guided numeric subquestions; it does not need to interpret or grade arbitrary written reasoning.
- Preserve entered working when checking an incorrect answer. Provide clear correction/reset controls.
- Save committed intermediate work with the current problem so home/continue or reload does not discard a multi-step solution in progress.
- Use authored expected numeric answers and validated number parsing, not execution of free-form expressions. Start with non-negative whole numbers; define decimal and euro-cent handling explicitly before enabling money problems.
- Review both arithmetic and language: avoid ambiguous references such as “el doble de ambos” without specifying which quantities are combined.

Problems should also use the robots' professions: seeds and seedlings for Brote, parcels for Rayo, portions for Burbuja and materials for Tuerca. The fruit examples establish the interaction; chapters supply their own meaningful context.

## 5. Four reusable adventure mechanics

### A. Machine / connections

**Existing foundation:** the cable/pipe rotation game.

- Connect a fixed start and destination.
- Reuse the interaction for electricity, watering systems and other profession-specific problems.
- Keep the first implementation deterministic, with a small set of components.
- Later, explore a lightweight *The Incredible Machine*-style board: arrange components, press **Probar**, and watch a parcel move or a plant receive water.
- Switches, gears and conveyors are possible later additions, not requirements for the first release.
- **Do not build a general-purpose realistic physics sandbox now.**

Potential hosts: Chispa, Brote, Pixel, Cosmo and Eco.

### B. Packing / shapes

**Next new mechanic.**

- Fit pieces of different sizes and shapes into a grid-based container.
- Drag, rotate and place without overlap or going outside the container.
- Start with rectangles; add irregular pieces only after the basic interaction works.
- Provide selection/place controls and an explicit rotation action for keyboard and non-drag use.
- Configure the container, pieces and goal as data; do not create a separate implementation for every theme.

Possible presentations: parcels in a crate, garden beds, construction materials, flower groups or fabric pieces.

Possible mathematical goals: two equal groups, half the space, groups of two/five/ten, comparing remaining capacity, or lengths measured in explicitly labelled grid units. Area fitting alone does not demonstrate knowledge of kilos or litres.

Potential hosts: Brote, Rayo, Tuerca, Burbuja, Pétalo and Puntada.

### C. Clock

- Move clock hands to match a requested time.
- Begin with full hours, then half past and quarter past.
- Reuse the same clock for departures, deliveries and watering schedules.
- Provide keyboard/non-drag adjustment; validate the actual time represented by both hands.

Primary host: Tic. Other professions can reuse it for schedules.

### D. Money

- Select coins and notes to make a requested amount.
- Start with exact payment; add simple change later.
- Reuse a shop/counter interaction for seeds, tools, ingredients or fabric.
- Represent euro values exactly, avoiding floating-point rounding errors.

Primary host: Cora. Other chapters can reuse the same interaction with different goods and amounts.

### Shared implementation expectations

All four mechanics should use a consistent host contract for content/configuration, resumable state, completion and skip where appropriate. Shared controls cover instructions, retry/reset, help, sound and explicit continuation. Keep narrative transitions in the chapter engine.

A new robot should usually require **story + vocabulary + artwork/configuration + puzzle data**, not a new game engine.

## 6. Delivery order

### Milestone 1 — Chapter menu and campaign saves — implemented

1. Add a chapter catalogue with stable IDs, robot metadata, order and content availability.
2. Implement the versioned multi-chapter progress model and migrate current Chispa saves.
3. Add home-screen chapter cards and explicit final-chapter completion.
4. Test locking, hidden titles, revealing an unavailable chapter, resume and replay.
5. Ship with Chispa playable and future entries represented honestly as locked or **Próximamente**.

Start with the existing seven robots, Chispa first. Expand the catalogue to 12 as the five new robots and chapter titles are confirmed; do not invent final titles just to populate cards.

### Milestone 2 — Align Chispa and establish learning configuration

1. Make carrying addition Chispa's default mathematical objective.
2. Define how a chapter's objective interacts with player difficulty/accessibility overrides.
3. Keep arithmetic practice independent from story completion.
4. Review the current text, terminology and connection-game vocabulary together.
5. Add the shared numeric-answer question format and a first one-step contextual problem, including number entry and feedback.
6. Add optional intermediate work and guided subquestions, then introduce multi-step problems as prerequisite skills become available. Keep this independent of developing new minigame engines.

### Milestone 3 — Reusable packing game and second playable chapter

1. Build and test the grid-placement mechanic separately.
2. Define a small data-driven puzzle format with known valid solutions.
3. Add save/resume and non-drag controls.
4. Use Brote as the first candidate for another profession-themed chapter.
5. Add the numeration activities needed for Brote's goal; do not assume a packing puzzle alone teaches numbers to 1,000.
6. Verify that the same packing engine can serve another theme before expanding its features.

### Milestone 4 — Clock and money

Build these as separate reusable mechanics, one at a time, with focused chapter content and tests. Their implementation order can follow the next confirmed chapter; it does not require writing all earlier proposed chapters first.

### Milestone 5 — Expand the syllabus and chapter catalogue

- Extend arithmetic to hundreds, doubles/halves and multiplication.
- Add activities that explicitly teach the remaining number, measurement and reasoning goals.
- Author additional chapters by reusing the four mechanics.
- Add repeatable practice for skills that need consolidation.
- Consider more machine components only after the initial mechanics and chapter progression are stable.

## 7. Validation and acceptance

- Only the first chapter is initially available.
- Locked chapters reveal neither title nor robot identity.
- Finishing a chapter reveals only its successor; unwritten content stays unplayable.
- Completion/unlocks survive reload and chapter replay.
- Switching chapters preserves each chapter's unfinished calculation and puzzle state.
- Legacy saves and blocked-storage play remain supported.
- Maths practice remains independent of chapter progression.
- New puzzle data is validated for legal pieces, bounds and achievable goals.
- Touch, keyboard, large text, reduced motion and small landscape layouts remain usable.
- Games use the available viewport without clipping instructions or controls.
- Music follows the current view/activity and the player's sound preference; no external requests are needed during play.
- Numeric questions check the requested final quantity, reject blank/invalid input, and keep the complete problem visible.
- Multi-step problems preserve working across retry and resume; intermediate help is optional and does not force one solution strategy.
- Tests cover one-step problems, doubles/halves, multi-step totals, incorrect answers, guided steps, alternate valid working paths and saved intermediate work.
- Every chapter receives a Spanish-language, vocabulary and mathematical-content review.

Latest chapter-menu validation: **114 unit/component tests pass; production build passes; 44/44 browser tests pass.** The factory finger-drag test in `tests/e2e/touch.spec.ts` failed in earlier runs but passed in the latest full run without a targeted fix. Investigate that intermittent behaviour before relying on dragging as the principal interaction for packing.

## 8. Decisions still to confirm

- Final names, professions and ordering beyond Chispa; final titles for future chapters.
- How chapter learning objectives interact with freely chosen maths difficulty.
- Whether six construction exercises remain the right introduction for every mathematical topic; not every topic is an arithmetic operation.
- How to provide enough practice without turning the story into a long exercise sequence.
- Which machine extensions are worth building after the existing connection mechanic.

**Next implementation step: align Chispa's maths objective and add shared numeric-answer problems (Milestone 2).**
