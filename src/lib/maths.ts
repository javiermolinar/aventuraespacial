export type Operation = { a: number; b: number; operator: '+' | '−'; extraAddends?: number[] };

export function largerFirst(operation: Operation): Operation {
  return operation.operator === '+' && operation.a < operation.b
    ? { ...operation, a: operation.b, b: operation.a }
    : { ...operation };
}

export function resultOf(operation: Operation) {
  return operation.operator === '+' ? operation.a + operation.b + (operation.extraAddends ?? []).reduce((sum, n) => sum + n, 0) : operation.a - operation.b;
}

/** Split a column total into the amount carried and the digit left behind.
 * Two addends can carry at most one ten; larger totals also work for future exercises.
 */
export function regroupUnits(total: number) {
  if (!Number.isSafeInteger(total) || total < 0) throw new RangeError('Expected a non-negative integer column total');
  return { tens: Math.floor(total / 10), ones: total % 10 };
}

export function needsExchange(operation: Operation) {
  const a = operation.a % 10;
  const b = operation.b % 10;
  return operation.operator === '+' ? a + b + (operation.extraAddends ?? []).reduce((sum, n) => sum + n % 10, 0) >= 10 : a < b;
}

export function needsTens(operation: Operation) {
  return Math.max(operation.a, operation.b, resultOf(operation)) >= 10;
}

export function columnAnswer(operation: Operation, column: 'ones' | 'tens') {
  const result = resultOf(operation);
  return column === 'ones' ? result % 10 : Math.floor(result / 10);
}

export function operationLabel(operation: Operation) {
  return `${operation.a} ${operation.operator} ${operation.b}${(operation.extraAddends ?? []).map(n => ` + ${n}`).join('')}`;
}
