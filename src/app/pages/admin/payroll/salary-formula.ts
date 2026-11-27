/** Evaluates the arithmetic subset used by payroll component formulas without eval(). */
export function evaluateSalaryFormula(
  expression: string,
  componentAmounts: Record<string, number>,
): number {
  const tokens = tokenize(expression);
  let position = 0;

  function peek(): string | undefined {
    return tokens[position];
  }

  function take(): string {
    const token = tokens[position];
    if (token === undefined) throw new Error('Unexpected end of formula.');
    position += 1;
    return token;
  }

  function expect(expected: string): void {
    if (take() !== expected) throw new Error(`Expected ${expected}.`);
  }

  function parsePrimary(): number {
    const token = take();
    if (token === '(') {
      const value = parseComparison();
      expect(')');
      return value;
    }
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
      const name = token.toUpperCase();
      if (peek() !== '(') {
        const value = componentAmounts[name];
        if (value === undefined) throw new Error(`Unknown component code: ${name}.`);
        return value;
      }

      take();
      const args: number[] = [];
      if (peek() !== ')') {
        do {
          args.push(parseComparison());
          if (peek() !== ',') break;
          take();
        } while (true);
      }
      expect(')');

      if (name === 'IF' && args.length === 3) return args[0] !== 0 ? args[1] : args[2];
      if (name === 'MIN' && args.length > 0) return Math.min(...args);
      if (name === 'MAX' && args.length > 0) return Math.max(...args);
      throw new Error(`Unsupported function or argument count: ${name}.`);
    }

    throw new Error(`Unexpected token: ${token}.`);
  }

  function parseUnary(): number {
    if (peek() === '+') {
      take();
      return parseUnary();
    }
    if (peek() === '-') {
      take();
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parseMultiplicative(): number {
    let value = parseUnary();
    while (peek() === '*' || peek() === '/') {
      const operator = take();
      const right = parseUnary();
      if (operator === '/' && right === 0) throw new Error('Division by zero.');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  function parseAdditive(): number {
    let value = parseMultiplicative();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = parseMultiplicative();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseComparison(): number {
    let value = parseAdditive();
    while (['<', '<=', '>', '>=', '=', '==', '!=', '<>'].includes(peek() ?? '')) {
      const operator = take();
      const right = parseAdditive();
      const matches =
        operator === '<' ? value < right :
        operator === '<=' ? value <= right :
        operator === '>' ? value > right :
        operator === '>=' ? value >= right :
        operator === '=' || operator === '==' ? value === right : value !== right;
      value = matches ? 1 : 0;
    }
    return value;
  }

  const result = parseComparison();
  if (position !== tokens.length || !Number.isFinite(result)) {
    throw new Error('Invalid formula expression.');
  }
  return result;
}

function tokenize(expression: string): string[] {
  expression = expression.trim();
  if (!expression) throw new Error('Formula expression is empty.');
  const tokens: string[] = [];
  const tokenPattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|<>|!=|==|[()+\-*/,<>=]))/gy;
  let position = 0;

  while (position < expression.length) {
    tokenPattern.lastIndex = position;
    const match = tokenPattern.exec(expression);
    if (!match) throw new Error('Invalid character in formula expression.');
    const token = match[1] ?? match[2] ?? match[3];
    if (!token) throw new Error('Invalid formula expression.');
    tokens.push(token);
    position = tokenPattern.lastIndex;
  }

  return tokens;
}
