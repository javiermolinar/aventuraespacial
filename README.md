# Una aventura espacial

A reading and maths adventure for children, in Spanish. Read the story, solve
maths problems to build robots, and help the crew on their journey home.

**[Play the adventure](https://javiermolinar.github.io/aventuraespacial/)** ·
**[Free practice](https://javiermolinar.github.io/aventuraespacial/practice.html)**

## The game

Three chapters are playable, unlocking in order:

| Robot | Chapter | Mission |
| --- | --- | --- |
| Chispa | Una voz entre las estrellas | Repair the radio and contact your parents. |
| Brote | ¡Qué hambre! | Find food and pack the supply boxes. |
| Rayo | Alarma en la oscuridad | Restore the electricity after a meteorite impact. |

Free practice includes 14 arithmetic levels, circuits, water and cable puzzles,
shape packing, clocks, number grids, and laser logic games.

Adventure progress and the robot collection are saved in the current browser.
Mouse, touch and keyboard controls are supported. Sound is optional, and
animations respect reduced-motion preferences. No accounts, ads or backend.

## Run locally

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally [localhost:5173](http://localhost:5173).

## Check and build

```sh
npm run chapter:check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
TEST_PRODUCTION=1 npm run test:e2e
```

Preview the static build with `npm run preview`. Deploy the contents of `dist/`;
GitHub Actions checks and deploys `main` to GitHub Pages.

## Write a chapter

`npm run chapter:new -- tuerca` creates an unpublished draft. During development,
open `/?chapter-preview=rayo&scene=robot-introduction` to preview a scene without
touching real saves. See the [chapter authoring guide](src/adventure/README.md)
for the script format, artwork, validation and publishing workflow.

## Documentation

- [Development](docs/development.md): architecture, saves, adding games and deployment.
- [Chapter authoring](src/adventure/README.md): stories, previews and save migrations.
- [Laser patrol](src/games/laser-rats/README.md): rules, generation and solver.
- [Shared clocks](src/components/clocks/README.md): reusable clock components.
- [Music credits](public/music/ATTRIBUTION.txt) and [third-party notices](THIRD_PARTY_NOTICES.md).
