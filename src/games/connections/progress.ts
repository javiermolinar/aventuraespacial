import { connectionGames } from './levels';
import { advancedConnectionGames } from './advanced-levels';
import { pipeFlow, validRotations, type ConnectionTheme } from './pipes';

export const connectionsStorageKey = 'space-connections-v1';
export type ConnectionsProgress = {
  current: Record<ConnectionTheme, number>;
  advancedCurrent: Record<ConnectionTheme, number>;
  puzzles: Record<string, { rotations: number[]; completed: boolean; tested?: boolean }>;
};

export function loadConnectionsProgress(): ConnectionsProgress {
  const progress: ConnectionsProgress = { current: { water: 0, radio: 0 }, advancedCurrent: { water: 0, radio: 0 }, puzzles: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(connectionsStorageKey) ?? 'null');
    for (const theme of ['water', 'radio'] as const) {
      for (const [key, games] of [['current', connectionGames], ['advancedCurrent', advancedConnectionGames]] as const) {
        const levels = games[theme].levels;
        const current = saved?.[key]?.[theme];
        if (Number.isInteger(current) && current >= 0 && current < levels.length) progress[key][theme] = current;
        for (const level of levels) {
          const entry = saved?.puzzles?.[level.id];
          if (validRotations(entry?.rotations, level.layout.tiles.length)) {
            progress.puzzles[level.id] = { rotations: entry.rotations, tested: entry.tested === true,
              completed: entry.completed === true || ((!level.layout.network || entry.tested === true) && pipeFlow(level.layout, entry.rotations).solved) };
          }
        }
      }
    }
  } catch { /* Missing, unavailable or malformed storage starts a fresh game. */ }
  return progress;
}

export function saveConnectionsProgress(progress: ConnectionsProgress): boolean {
  try { localStorage.setItem(connectionsStorageKey, JSON.stringify(progress)); return true; }
  catch { return false; }
}
