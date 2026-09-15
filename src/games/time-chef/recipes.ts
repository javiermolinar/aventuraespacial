// All recipes are on the same calendar day: early/late is not a shortest
// distance around midnight. Duration arithmetic is deliberately not taught here.
export function cookingResult(answer: number, target: number) {
  return answer === target ? 'perfect' : answer < target ? 'early' : 'burned';
}
export type Recipe = { name: string; dish: 'pancakes' | 'cake' | 'soup'; target: number; format: 'digital' | 'analog' | 'words' };
export const menus: { name: string; recipes: Recipe[] }[] = [
  { name: 'Horas en punto', recipes: [
    { name: 'Tortitas del sol', dish: 'pancakes', target: 8 * 60, format: 'digital' },
    { name: 'Bizcocho de estrellas', dish: 'cake', target: 16 * 60, format: 'analog' },
    { name: 'Sopa de la luna', dish: 'soup', target: 21 * 60, format: 'words' },
  ] },
  { name: 'Y media', recipes: [
    { name: 'Tortitas del sol', dish: 'pancakes', target: 8 * 60 + 30, format: 'digital' },
    { name: 'Bizcocho de estrellas', dish: 'cake', target: 16 * 60 + 30, format: 'analog' },
    { name: 'Sopa de la luna', dish: 'soup', target: 21 * 60 + 30, format: 'words' },
  ] },
  { name: 'Y cuarto', recipes: [
    { name: 'Tortitas del sol', dish: 'pancakes', target: 9 * 60 + 15, format: 'digital' },
    { name: 'Bizcocho de estrellas', dish: 'cake', target: 17 * 60 + 15, format: 'analog' },
    { name: 'Sopa de la luna', dish: 'soup', target: 21 * 60 + 15, format: 'words' },
  ] },
];
