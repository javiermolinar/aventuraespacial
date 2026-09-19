import { largerFirst, type Operation } from '../../lib/maths';

export type Random = () => number;
type Operator = Operation['operator'];
type StageGenerator = (operator: Operator, random: Random) => Operation;

function integer(min: number, max: number, random: Random) {
  return min + Math.floor(random() * (max - min + 1));
}

function operation(a: number, b: number, operator: Operator): Operation {
  return largerFirst({ a, b, operator });
}

export function generateSmallOperation(operator: Operator, random: Random = Math.random): Operation {
  if (operator === '+') {
    const total = integer(2, 9, random);
    const a = integer(1, total - 1, random);
    return operation(a, total - a, operator);
  }
  const a = integer(1, 9, random);
  return operation(a, integer(1, a, random), operator);
}

function withoutExchange(operator: Operator, random: Random, large: boolean): Operation {
  const aTens = integer(large ? 3 : 1, large ? 6 : 4, random);
  const bTens = operator === '+'
    ? integer(large ? 1 : 0, Math.min(3, 9 - aTens), random)
    : integer(large ? 1 : 0, aTens - 1, random);
  const aOnes = integer(0, 9, random);
  const bOnes = integer(0, operator === '+' ? 9 - aOnes : aOnes, random);
  // Avoid a zero operand without introducing a unit exchange.
  return operation(aTens * 10 + aOnes, bTens * 10 + bOnes || 10, operator);
}

export function generatePlaceValueOperation(operator: Operator, random: Random = Math.random): Operation {
  return withoutExchange(operator, random, false);
}

export function generateUpToTwentyOperation(operator: Operator, random: Random = Math.random): Operation {
  if (operator === '+') {
    const a = integer(2, 9, random);
    return operation(a, integer(10 - a, 9, random), operator);
  }
  const a = integer(11, 19, random);
  return operation(a, integer(1, a % 10, random), operator);
}

function withExchange(operator: Operator, random: Random, large: boolean): Operation {
  if (operator === '+') {
    const aTens = integer(large ? 2 : 1, large ? 5 : 4, random);
    const bTens = integer(1, 8 - aTens, random);
    const aOnes = integer(1, 9, random);
    const bOnes = integer(10 - aOnes, 9, random);
    return operation(aTens * 10 + aOnes, bTens * 10 + bOnes, operator);
  }
  const aTens = integer(3, large ? 8 : 6, random);
  const bTens = integer(1, aTens - 2, random);
  const aOnes = integer(0, 8, random);
  const bOnes = integer(aOnes + 1, 9, random);
  return operation(aTens * 10 + aOnes, bTens * 10 + bOnes, operator);
}

export function generateCarryingOperation(operator: Operator, random: Random = Math.random): Operation {
  return withExchange(operator, random, false);
}

export function generateLargeOperation(operator: Operator, random: Random = Math.random): Operation {
  return withoutExchange(operator, random, true);
}

export function generateAdvancedCarryingOperation(operator: Operator, random: Random = Math.random): Operation {
  return withExchange(operator, random, true);
}

const stageGenerators: StageGenerator[] = [
  generateSmallOperation,
  generatePlaceValueOperation,
  generateUpToTwentyOperation,
  generateCarryingOperation,
  generateLargeOperation,
  generateAdvancedCarryingOperation,
];

export function generateMixedOperation(operator: Operator, random: Random = Math.random): Operation {
  // Borrowing is taught separately, never introduced by mixed practice.
  const generators = operator === '−'
    ? [generateSmallOperation, generatePlaceValueOperation, generateUpToTwentyOperation, generateLargeOperation]
    : stageGenerators;
  return generators[integer(0, generators.length - 1, random)](operator, random);
}


export function generateHundredsOperation(operator: Operator, random: Random = Math.random): Operation {
  const aHundreds = integer(2, 6, random);
  const bHundreds = integer(1, operator === '+' ? 9 - aHundreds : aHundreds - 1, random);
  const aTens = integer(0, 9, random), aOnes = integer(0, 9, random);
  const bTens = integer(0, operator === '+' ? 9 - aTens : aTens, random);
  const bOnes = integer(0, operator === '+' ? 9 - aOnes : aOnes, random);
  return operation(aHundreds * 100 + aTens * 10 + aOnes, bHundreds * 100 + bTens * 10 + bOnes, operator);
}

export function generateHundredsExchange(operator: Operator, random: Random = Math.random): Operation {
  const aHundreds = integer(2, 6, random);
  const bHundreds = integer(1, operator === '+' ? 8 - aHundreds : aHundreds - 1, random);
  if (operator === '+') {
    const aTens = integer(1, 9, random), aOnes = integer(1, 9, random);
    return operation(aHundreds * 100 + aTens * 10 + aOnes,
      bHundreds * 100 + integer(9 - aTens, 9, random) * 10 + integer(10 - aOnes, 9, random), operator);
  }
  // Include borrowing through a zero tens column, e.g. 402 − 178.
  const aTens = integer(0, 8, random), aOnes = integer(0, 8, random);
  return operation(aHundreds * 100 + aTens * 10 + aOnes,
    bHundreds * 100 + integer(aTens, 9, random) * 10 + integer(aOnes + 1, 9, random), operator);
}

export function generateTripleAddition(_operator: Operator, random: Random = Math.random): Operation {
  const values = Array.from({ length: 3 }, () => integer(1, 2, random) * 100 + integer(7, 9, random) * 10 + integer(7, 9, random)).sort((a, b) => b - a);
  return { a: values[0], b: values[1], operator: '+', extraAddends: [values[2]] };
}

export function generateRound(level: number, pieceCount: number, random: Random = Math.random): Operation[] {
  const generator = [...stageGenerators, generateMixedOperation, generateHundredsOperation, generateHundredsExchange, generateHundredsExchange, generateTripleAddition][level];
  if (!generator) throw new RangeError(`Unknown maths stage: ${level}`);
  // Stage 4 teaches addition carries; stage 6 separately teaches subtraction borrowing.
  const focusedOperator = level === 3 || level === 8 || level === 10 ? '+' : level === 5 || level === 9 ? '−' : undefined;
  const operators: Operator[] = Array.from({ length: pieceCount }, (_, index) => focusedOperator ?? (index % 2 ? '−' : '+'));
  for (let i = operators.length - 1; i > 0; i--) {
    const j = integer(0, i, random);
    [operators[i], operators[j]] = [operators[j], operators[i]];
  }
  return operators.map(operator => generator(operator, random));
}
