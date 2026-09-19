# La patrulla láser

Standalone Spanish logic game at `/games/laser-rats.html`, linked from practice.
Nine fixed lessons introduce laser geometry, walls, separate robot pieces,
interleaved exploration and firing, and a final four-piece challenge.

## Explore, fire, explore again

- Every cell starts hidden. The starred cell is the safe, validated opening.
  Clicking another cell before opening it leaves the round unchanged and points
  the player to the star. Rat positions never move, including on restart.
- Each discovered non-wall cell displays the number of **remaining rats in its
  eight neighboring cells**, including diagonal neighbors. A zero automatically
  reveals its neighbors and expands through connected zero cells. Walls are
  revealed but never expand the opening. Live rats remain hidden.
- Clues are shown directly on the board, with no directional radar, adjacency
  caption, or neighbor highlighting. Help explains the eight-cell neighborhood.
- Scanning is unlimited. Clicking a live rat loses. Clicking a wall is harmless.
  Discovering an empty cell also reveals walls in its eight neighboring cells.
- Each inventory entry is a separate finite piece: row (left/right), column
  (up/down), or diagonal (all four diagonals). Place it on a discovered empty
  cell; it fires immediately and stays there permanently. Robots cannot overlap.
- Lasers clear rats and reveal the traversed cells. They pass through friendly
  robots and stop at the first wall, revealing that wall. A cleared rat cell can
  be scanned and used for a later robot.
- **Every shot updates all clues.** Newly cleared cells supply new clues; old
  discovered cells whose local count becomes zero also expand automatically.
  Exploration can stall until a robot opens more of the board. Players do not
  need to locate every rat before firing.
- Clearing every rat wins, including on the final shot. Otherwise placing the
  last available robot loses. The remaining board is exposed on either outcome.
  Retries are unlimited. The round is not persisted.

Drag a robot from the reserve to a discovered empty cell, or select it and then
activate the destination. Mouse, pen and touch share valid/invalid drop previews
and edge scrolling. Escape and cancelled or invalid drops do not consume pieces
or reveal cells. Keyboard arrows navigate; Enter/Space activate. The reserve
collapses when empty. Help is behind the question-mark icon.

Audio uses the existing opt-in sound preference and bundled Cipher soundtrack.
Reveal ripples, laser sweeps, rat effects and completion stars honor reduced
motion. Robot silhouettes identify their firing directions. During play, small
robot/cleared-rat marks leave the adjacent count readable on their cells.

## Validation and generation

`generatePuzzle({ size, rats, walls, robots, seed })` accepts square sizes 4–9,
1–24 rats, walls leaving a safe opening, and 1–12 robot pieces. Repeated types
are supported. Inventory indices are stable piece IDs throughout rules, planning,
and replay. The default is 7 × 7, 10 rats, 3 walls, and one of each robot type.
A fixed seed reproduces a layout for the same options and generator version.

After the last lesson, **Siguiente reto** generates another board. A worker keeps
this off the UI thread, with a 15-second timeout and cancellation on restart or
lesson change. Generation failure retains the current round and allows retry.
Normally at most 120 candidates and 18,000 search nodes per candidate are used.
Requested counts and inventory are never silently reduced.

1. Candidate creation samples walls and targets reachable from possible robot
   positions, preserving exact counts and a safe opening.
2. `observe` exposes discovered safe cells, known walls, remaining-rat count,
   and adjacent clues. `deduce` receives **only this public observation**.
3. Zero/full cardinality groups and subtraction between two original clues prove
   safe cells or rats. Neighbor groups and the public total are the only count
   constraints. Combined-clue chains are deliberately bounded.
4. Certification scans only cells proved safe and records their explanations.
   Automatic zero expansion uses the same rules as the UI.
5. At a deduction stall, `knownShots` considers only discovered empty origins
   and unused pieces with at least one **guaranteed hit**. Individual rat
   positions need not be known: if three of four neighbors contain rats,
   covering two of them guarantees a hit. A ray's guaranteed prefix stops at a
   known wall or a cell that might hide one. Discovered empty cells and their
   neighbors are known wall-free unless a wall is shown; deduced rats also
   cannot be walls. Other unseen cells may block a beam.
   Candidate selection/ranking uses public knowledge, never hidden rat positions.
6. Each candidate shot is replayed through the game rules and deduction resumes
   with the resulting clues. Bounded backtracking accounts for occupied origins,
   used pieces, remaining targets, and revealed cells. Once the full remaining
   map is inferred, a cheaper complete-map laser planner finishes the search.
7. A returned certificate has ordered **`steps`**, each a proved-safe scan or a
   shot with a guaranteed hit count. Replay `steps` in order. `scans` and `shots`
   are summary projections, not two independent replay phases.

A certificate establishes a winning route from the **marked opening** with no
speculative rat clicks and with at least one guaranteed hit per shot. It is conservative:
blind exploratory shots and deductions beyond the supported rules may work but
are not certified. `no-plan` is not an impossibility proof; `search-limit` is
separate. Backtracking explores actual shot outcomes; it does not prove that
all strategic choices are equally good or that a winning choice is forced by
public clues in every possible hidden layout. Finite robot placement remains a
planning challenge. Do not present this as a guarantee that every legal move wins.

## Lessons

- **Sigue las líneas**, A4: a zero opening and complementary row/column robots.
- **Cruces y diagonales**, A1: adjacent clues with diagonal coverage.
- **Al otro lado del muro**, D4: walls block beams. One
  winning sequence is diagonal E5 → column D4 → row C4.
- **Tres robots de filas**, C3: three distinct row pieces stay where placed.
- **Abre camino**, C5: the opening locates no individual rats and proves no
  safe next scan. Its three adjacent rats among four non-wall neighbors
  guarantee a row robot at C5 will hit at least one. It actually clears three
  rats and opens new clue cells. Continue with diagonal A5, scan E3, then
  column E1 (after the diagonal clears E1).
- **Paso a paso**, B1: a compact 5 × 5 reinforcement round. Only the row robot
  has a guaranteed opening hit. Row B1 opens six additional cells; the new
  numbers support further safe exploration. Column D1 and diagonal D3 finish
  the four remaining rats once their positions are deduced.
- **Terreno recuperado**, A4: an 8-rat, 6 × 6 lesson in reusing cleared ground.
  Row A4 clears C4; walls at C2 and C6 enclose the remaining rats at C3 and C5.
  After safe exploration, column C4 and diagonal F3 finish in either order.
  Winning requires placing a robot on a former rat cell, even with the entire
  map known. The opening shot reveals eleven additional cells.
- **Piensa dos jugadas**, E6: a 9-rat, 6 × 6 planning lesson. Row E6 reveals nine
  additional cells, then safe exploration locates all five remaining rats.
  Diagonal B1 clears three and leaves B3/B4 for column B2. Diagonal C4 also
  clears three but strands the remaining rats in different columns. All the
  information needed to compare those finishes is available before committing.
- **La última patrulla**, F1: four pieces are necessary even on a fully known
  board. Row F1 → row E4 → diagonal B5 → column G1 wins with safe exploration
  between shots. Diagonal F3 clears four rats but leaves an impossible remainder for the other
  pieces. This is a strategic trap, independent of the clue system.

The diagonal robot covers four rays versus two for the other kinds. Puzzle
certification is a correctness check, not a measurement of difficulty; the
lesson progression still needs player testing.

The three bridge lessons retain the same zero-expansion rules. Their layouts
limit the first shot to revealing at most 40% of the board and require more
deduction afterward. Each has a single guaranteed-hit opening shot and needs
all three robot types. They precede the four-piece finale; generated missions
still begin only after completing that final lesson.

## Checks

`npx vitest run src/games/laser-rats` checks local counts, zero expansion, walls,
clue updates after kills, a mandatory interleaving lesson, ordered proof replay,
finite inventory, generator seeds, sound mapping, and keyboard behavior. The
bridge lessons also check limited opening reveals, mandatory cleared-cell reuse,
and the fully deducible choice between the final two shots. An
independent exhaustive 4 × 4 oracle checks deductions and guaranteed hits
against all rat layouts consistent with adjacent clues, including the most
restrictive hidden walls compatible with the discovered cells.

`npx playwright test tests/e2e/laser-rats.spec.ts` checks navigation, the marked
opening, clue presentation, progression through all nine certificate playthroughs, generation/retry,
mouse and touch drags, responsive layout and full missions. Production prefix
coverage also exercises the generated-board worker under a subdirectory.
