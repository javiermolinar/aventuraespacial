export const wrap = (value: number, size: number) => ((value % size) + size) % size;
export const normalizeTime = (minutes: number) => wrap(minutes, 1440);
export function digitalTime(minutes: number) {
  const time = normalizeTime(minutes);
  return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
}
export function period(minutes: number) {
  const hour = Math.floor(normalizeTime(minutes) / 60);
  return hour < 6 ? 'de la madrugada' : hour < 12 ? 'de la mañana' : hour < 20 ? 'de la tarde' : 'de la noche';
}
export function spokenTime(minutes: number) {
  const time = normalizeTime(minutes), hour = Math.floor(time / 60), minute = time % 60;
  if (time === 0) return 'Las 12 de la noche · medianoche';
  if (time === 720) return 'Las 12 del mediodía';
  const number = hour % 12 || 12;
  const suffix = minute === 0 ? 'en punto' : minute === 30 ? 'y media' : minute === 15 ? 'y cuarto' : `y ${minute}`;
  return `${number === 1 ? 'La' : 'Las'} ${number} ${suffix} ${period(time)}`;
}
export function handAngles(minutes: number) {
  return { hour: wrap(minutes, 720) / 2, minute: wrap(minutes, 60) * 6 };
}
export function angleDelta(previous: number, next: number) {
  return wrap(next - previous + 180, 360) - 180;
}
