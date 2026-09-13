export const playerNameMaxLength = 24;

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Returns plain text, never markup; replacement callbacks preserve literal $ characters. */
export function personalize(text: string, playerName: string): string {
  return text.replace(/\{\{name\}\}/g, () => playerName || 'piloto');
}
