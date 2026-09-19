// All recipes are on the same calendar day: early/late is not a shortest
// distance around midnight. Duration arithmetic is deliberately not taught here.
export function cookingResult(answer: number, target: number) {
  return answer === target ? 'perfect' : answer < target ? 'early' : 'burned';
}
export type Recipe = { name: string; dish: 'toast' | 'pancakes' | 'cake' | 'soup'; target: number; format: 'digital' | 'analog' | 'words'; clock: 'analog' | 'digital' };
export type Menu = { name: string; recipes: Recipe[]; randomMinutes?: boolean };
export const menus: Menu[] = [
  { name: 'Horas en punto', recipes: [
    { name: 'Tostadas del chef', dish: 'toast', target: 8 * 60, format: 'digital', clock: 'analog' },
    { name: 'Tortitas del sol', dish: 'pancakes', target: 10 * 60, format: 'analog', clock: 'digital' },
    { name: 'Bizcocho de estrellas', dish: 'cake', target: 16 * 60, format: 'digital', clock: 'analog' },
    { name: 'Sopa de la luna', dish: 'soup', target: 21 * 60, format: 'words', clock: 'digital' },
  ] },
  { name: 'Y media', recipes: [
    { name: 'Tostadas del chef', dish: 'toast', target: 8 * 60 + 30, format: 'digital', clock: 'analog' },
    { name: 'Tortitas del sol', dish: 'pancakes', target: 10 * 60 + 30, format: 'analog', clock: 'digital' },
    { name: 'Bizcocho de estrellas', dish: 'cake', target: 16 * 60 + 30, format: 'digital', clock: 'analog' },
    { name: 'Sopa de la luna', dish: 'soup', target: 21 * 60 + 30, format: 'words', clock: 'digital' },
  ] },
  { name: 'Cuartos de hora', recipes: [
    { name: 'Tostadas del chef', dish: 'toast', target: 9 * 60 + 15, format: 'digital', clock: 'analog' },
    { name: 'Tortitas del sol', dish: 'pancakes', target: 10 * 60 + 45, format: 'analog', clock: 'digital' },
    { name: 'Bizcocho de estrellas', dish: 'cake', target: 17 * 60 + 15, format: 'digital', clock: 'analog' },
    { name: 'Sopa de la luna', dish: 'soup', target: 21 * 60 + 45, format: 'words', clock: 'digital' },
  ] },
  { name: 'Cualquier minuto', randomMinutes: true, recipes: [
    { name: 'Tostadas del chef', dish: 'toast', target: 8 * 60 + 17, format: 'digital', clock: 'analog' },
    { name: 'Tortitas del sol', dish: 'pancakes', target: 10 * 60 + 23, format: 'analog', clock: 'digital' },
    { name: 'Bizcocho de estrellas', dish: 'cake', target: 16 * 60 + 42, format: 'digital', clock: 'analog' },
    { name: 'Sopa de la luna', dish: 'soup', target: 21 * 60 + 56, format: 'words', clock: 'digital' },
  ] },
];

// Generate once per menu, never on a retry or input change. Non-five-minute
// targets ensure this level actually practices reading the small minute marks.
const fineMinutes = Array.from({ length: 59 }, (_, index) => index + 1).filter(minute => minute % 5 !== 0);
export function createMenu(level: number, random = Math.random): Menu {
  const menu = menus[level];
  return { ...menu, recipes: menu.recipes.map(recipe => ({
    ...recipe,
    target: menu.randomMinutes
      ? Math.floor(recipe.target / 60) * 60 + fineMinutes[Math.floor(random() * fineMinutes.length)]
      : recipe.target,
  })) };
}
