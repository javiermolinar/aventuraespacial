# Shared clocks

Controlled React components for time-of-day games. They contain no recipes, scoring, sounds, progression, navigation, or storage. Player-facing labels are Spanish, matching the site.

```tsx
import { AnalogClock } from './AnalogClock';
import { DigitalClock } from './DigitalClock';

const [time, setTime] = useState(8 * 60 + 30);

// Interactive; both can share the same value or have independent state.
<AnalogClock value={time} onChange={setTime} />
<DigitalClock value={time} onChange={setTime} label="Alarma" />

// Display-only: no focusable controls.
<AnalogClock value={16 * 60} />
<DigitalClock value={16 * 60} />
```

## Contract

- `value`: integer minutes since midnight, from `0` through `1439`. Use `normalizeTime` for external values. This is not an elapsed duration or a date/time-zone value.
- `onChange?`: receives the proposed time, normalized into that range. Omit for display-only use.
- `disabled?`: disables interaction without changing the displayed value.
- `minuteStep?`: `1 | 5 | 15 | 30`, defaults to `5`. Incremental changes preserve any existing off-step offset.
- `DigitalClock.label?`: accessible name of the input group; defaults to `Reloj digital de 24 horas`.
- `AnalogClock.activeHand?`: `'hour' | 'minute'`. When supplied on an interactive clock, the numbers become tap/click/keyboard buttons that set this hand directly. Omit to retain drag-only numbers.
- `AnalogClock.onActiveHandChange?`: reports which hand starts a drag, so a parent-provided hand picker can follow it.

The analog clock is a 12-hour face. Games must supply day-period context or controls themselves if an answer distinguishes morning from evening. The digital clock always displays 24-hour time. Rendering one does not reveal the other's representation unless the parent chooses to do so.

With `activeHand`, tapping a number sets the hour within the current half-day or the minutes within the current hour. For example, tapping 6 in minute mode sets `:30`. This direct selection does not carry hours; dragging still does. The number hit areas stay separate from the hand tips.

Drag the colored hand tips or focus a hand and use arrow keys. Hours move by whole-hour steps, retaining the minutes. Minutes advance with their hour hand and wrap through noon/midnight. Pointer capture keeps dragging outside the dial working; Escape, pointer cancellation, and lost capture restore the time from before the drag. The short hand stays selectable when the hands overlap. Remount the component when resetting a task during a gesture (as Time Chef does with a task key).

Digital controls are native buttons: Tab to navigate, Enter/Space to change. Minute increment/decrement carries/borrows hours and wraps at midnight. Both components require the site's shared font and `.sr-only` utility from `src/styles/site.css`.

## Themes

Both import `clocks.css`. Size analog clocks with their container or a scoped `.analog-clock` rule; the SVG stays square. Keep interactive faces large enough for touch (the chef uses 265px). Set these variables on a game wrapper:

```css
.my-game {
  --clock-face: #fffdf6;
  --clock-rim: #e7b775;
  --clock-ink: #514737;
  --clock-hour: #9550ad;
  --clock-minute: #147e89;
  --clock-minor-tick: #d9cdb9;
  --clock-major-tick: #8b7660;
  --clock-focus: #d9c8ec;
  --clock-digital-face: #e4eee5;
  --clock-digital-ink: #244c4a;
}
```

`time.ts` exports normalization, digital/Spanish spoken formatting, day-period labels, hand angles, and signed drag-angle deltas. It has no game rules. Time Chef's early/late comparison belongs in its own `recipes.ts`.

Tests: `npm test` covers shared behavior; `npx playwright test tests/e2e/time-chef.spec.ts` covers real mouse/touch gestures, overlap, cancellation, 24-hour boundaries, keyboard completion, and responsive layouts in the consuming game.
