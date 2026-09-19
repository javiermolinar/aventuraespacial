# La patrulla láser

Standalone Spanish logic game at `/games/laser-rats.html`, linked from practice.
Five fixed lessons introduce straight lines, intersecting clues and
diagonals, a 7 × 7 board with walls, three separate row robots, and a final four-piece challenge.

## Rules

- Every cell starts hidden; no cell is selected and no clues are displayed.
  The first player exploration is always safe: if it hits a rat, that rat is
  relocated to a hidden empty cell, preserving rat and wall counts. After that
  opening, rats never move and clicking one loses.
- Scanning is unlimited. Clicking a live rat ends the round. Clicking an empty
  square reveals it and the walls in its eight neighboring cells. A wall click
  is harmless. Neighboring rats are not revealed.
- Radar counts remaining rats along all eight straight rays, through walls to
  the board edge. Only positive numbers appear, inside each discovered square,
  each beside its direction arrow. Counts sit around the edges in compass order.
  Neighboring cells stay clear and hidden; the number counts the entire ray. Discovered cells can be read
  again for free, and their clues update after each shot.
- Each inventory entry is a separate piece: row (left/right), column (up/down), diagonal
  (all four diagonals). Each robot is a finite piece, placed once on a discovered empty cell.
  It fires immediately and stays on that cell permanently: no moving, returning
  to the reserve, or firing again. Robot positions cannot overlap.
- Lasers clear every rat on a ray, pass through friendly robots, reveal the
  cells traversed, and stop at the first wall, revealing that wall. Cleared rat
  cells become legal deployment positions.
- Clearing every rat wins, including with the final robot. Otherwise,
  placing every available robot loses. Both outcomes expose the remaining board.
  Retries are unlimited. The current round is not persisted.
- Radar pings, rat surprises, laser sweeps, hit chords and the completion tune
  are synthesized locally. The bundled Cipher track supplies background music.
  All audio uses the existing opt-in sound preference. Reveal ripples, traveling
  beams, disappearing rats and completion stars honor reduced motion.

Clicks explore by default. Drag a figure from the finite reserve onto a
discovered empty cell. The reserve count decreases and the figure leaves the tray;
the robot remains on the board. The tray collapses when empty. Mouse, pen and touch share valid/invalid drop
previews and edge scrolling. Invalid drops, Escape and cancelled gestures do
not consume a piece or discover cells. Tap/keyboard selection plus destination
activation remains available as an accessible alternative. Help lives behind the top question-mark icon.
There are no hint buttons or configuration forms in the play area. Each robot
has a distinct silhouette: wide with horizontal cannons, tall with vertical
cannons, or diamond-shaped with four diagonal cannons. The counter shows one
rat face per target, changing to crossed eyes and a tongue when cleared.

After the fifth lesson, **Siguiente reto** generates another default 7 × 7 board.
Further completed boards offer the same continuation. The generator API below
retains configurable parameters for level design and testing.

## Generator and solver

`generatePuzzle({ size, rats, walls, robots, seed })` takes a square
size of 4–9, 1–24 rats, a wall count leaving room for a safe start, a nonempty
list of 1–12 entries drawn from `row`, `column`, `diagonal`. Repeated types
are allowed: `["row", "row", "row"]` supplies three separate row pieces. Each
piece uses its inventory index as a stable ID; positions and solver shots use
that ID, so placing one never consumes or moves another of the same type.

The default is 7 × 7 / 10 rats / 3 walls / all three robots.
A seed reproduces the same board for the same options and generator version.
Each generated round chooses a fresh seed. Call the API with a fixed seed to
reproduce a board during development.
There are finitely many boards for fixed parameters, so freshness is not a
mathematical uniqueness guarantee.

Validation deliberately separates private layout from public knowledge:

1. **Candidate:** seeded shuffling chooses walls and a possible fixed firing position
   for each robot. Rat positions are sampled from their reachable rays, excluding
   walls and firing origins. A safe start is chosen. Exact counts are preserved;
   the candidate still must pass public-clue deductions and plan replay.
2. **Observation:** the rules provide only discovered safe cells, known walls,
   public remaining-rat count and radar readings. `deduce` accepts this object,
   not the hidden `Puzzle`.
3. **Elementary logic:** binary rat variables obey a cardinality equation for
   each ray and the total. Zero/full groups force safe/rat cells. Subtracting
   a subset from another original clue permits overlapping-clue deductions.
   Comparisons between already-combined clues are excluded to avoid long chains.
4. **Safe discoveries:** reveal only cells proved safe, retain their explanations,
   and repeat. Stalled or inconsistent candidates are rejected. No speculative
   rat assignment can authorize a click.
5. **Laser planning:** after every rat has been logically located, bounded
   backtracking searches legal deployments on the inferred map. It tracks robot
   occupancy, used pieces, wall occlusion and cleared rat cells. A piece ID can
   appear at most once in a plan. Equivalent unused pieces are searched in index
   order to avoid redundant permutations. It tries shorter plans first and memoizes failed states.
6. **Replay:** run every planned shot through the actual game rules. Only a won
   round is returned, accompanied by safe-discovery proofs and its shot sequence.

This is a **conservative two-phase certificate**, not a complete solver for
all fair games. It first discovers all non-rat cells logically, then plans shots.
It may reject boards that need early laser exploration, more advanced deductions,
or interleaved scanning and firing. `no-plan` means no plan
was certified by this search, not a proof of impossibility. Search-limit failures
are reported separately. A certificate records a safe opening and a no-guess route from that opening.
The player can choose any first cell instead. We deliberately do not revalidate
that choice or a first-click rat relocation: safety is guaranteed, but a no-guess
solution from every chosen opening is not. The certificate also does not imply
that every later legal decision preserves a solution or that a child finds it easy.

Generation normally allows 120 candidates, with at most 18,000 search nodes per
candidate. A worker keeps the UI responsive and is terminated after 15 seconds.
Failure retains the current game and allows another attempt.
Switching lessons or restarting cancels pending generation so stale results cannot
replace the chosen board.

## What the handcrafted boards show

These paths begin by clicking the recorded opening (C3, B4, D4, C3, and D4 respectively).

- **Sigue las líneas:** blank directions open safe positions; row and column
  robots have clear complementary uses.
- **Cruces y diagonales:** the validator uses overlapping clues. One certified
  plan places row at C3, column at D4, and diagonal at D3.
- **Al otro lado del muro:** the layout is solvable with three fixed robots.
  A simple path scans E3 → E5, places diagonal at E5 and column at D4, then
  scans C4 and places the row robot there. All three stay where placed.

- **Tres robots de filas:** C1, C3 and C5 each need a different row piece.
  All three identical figures stay on their own squares.

- **La última patrulla:** 7 × 7, 12 rats, four walls, two row pieces, one column,
  and one diagonal. The D4 opening has a certified discovery route with two
  combined-clue deductions. All four pieces are necessary, even on a fully known
  map. One winning deployment is row B6 → diagonal A5 → column G4 → row D5,
  after the safe cells are discovered. A diagonal at F4 clears six rats but
  leaves an impossible remainder for the two rows and column. This fixed
  challenge was selected with solver-assisted layout exploration; difficulty
  still needs player testing. Its arbitrary-first-click limitation is the same
  as the other lessons.

The diagonal robot has four firing rays versus two for the others. Availability
does not imply every type must be used; playtesting should decide whether that
imbalance calls for different maps or a future rule change. Scan count, comparison
count and certified piece usage are available in certificates as useful tuning
signals, not established difficulty scores.

## Checks

`npx vitest run src/games/laser-rats` covers the game rules, loss/win boundaries,
replayable certificates, multiple generator seeds and inventories, audio event
mapping, permanent placement and keyboard behavior. An independent exhaustive 4 × 4 oracle checks
that every deduction agrees with every rat layout consistent with its clues.

`npx playwright test tests/e2e/laser-rats.spec.ts` covers practice navigation,
all lessons, worker generation, reset, hidden information, music, real mouse/touch drags, cancellation, fixed pieces and touch play.
Production project-prefix coverage also exercises the worker under a subdirectory.
