/**
 * Safe Mathematical Formula Evaluator for Pricing Calculations.
 * Parses and evaluates mathematical expressions without using eval() or Function().
 */

export type PricingVariables = {
  volume: number;
  material_rate: number;
  quality_mult: number;
  infill_mult: number;
  setup_fee: number;
  min_print: number;
  qty: number;
  modeling_fee: number;
  [key: string]: number;
};

export type EvaluationResult = {
  success: boolean;
  value: number;
  error?: string;
  steps?: {
    evaluatedExpression: string;
    variables: Record<string, number>;
  };
};

type TokenType = "NUMBER" | "IDENT" | "OP" | "LPAREN" | "RPAREN" | "COMMA" | "EOF";

type Token = {
  type: TokenType;
  value: string;
  pos: number;
};

const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  max: (...args) => (args.length === 0 ? 0 : Math.max(...args)),
  min: (...args) => (args.length === 0 ? 0 : Math.min(...args)),
  round: (n) => Math.round(n ?? 0),
  floor: (n) => Math.floor(n ?? 0),
  ceil: (n) => Math.ceil(n ?? 0),
  sqrt: (n) => Math.sqrt(Math.max(0, n ?? 0)),
  abs: (n) => Math.abs(n ?? 0),
  pow: (base, exp) => Math.pow(base ?? 0, exp ?? 0),
};

function tokenize(input: string): { tokens: Token[]; error?: string } {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number literal (e.g., 123, 12.34)
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[i + 1] ?? ""))) {
      const start = i;
      let hasDot = ch === ".";
      i++;
      while (i < len) {
        const next = input[i];
        if (/[0-9]/.test(next)) {
          i++;
        } else if (next === "." && !hasDot) {
          hasDot = true;
          i++;
        } else {
          break;
        }
      }
      tokens.push({ type: "NUMBER", value: input.slice(start, i), pos: start });
      continue;
    }

    // Identifier or function name (e.g., Math.max, max, volume, material_rate)
    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < len && /[a-zA-Z0-9_.]/.test(input[i])) {
        i++;
      }
      let rawIdent = input.slice(start, i);
      // Normalize "Math.foo" -> "foo"
      if (rawIdent.startsWith("Math.")) {
        rawIdent = rawIdent.slice(5);
      }
      tokens.push({ type: "IDENT", value: rawIdent.toLowerCase(), pos: start });
      continue;
    }

    // Single-char operators and punctuation
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%" || ch === "^") {
      tokens.push({ type: "OP", value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(", pos: i });
      i++;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")", pos: i });
      i++;
      continue;
    }

    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ",", pos: i });
      i++;
      continue;
    }

    return { tokens: [], error: `Unexpected character '${ch}' at position ${i + 1}` };
  }

  tokens.push({ type: "EOF", value: "", pos: len });
  return { tokens };
}

class Parser {
  private tokens: Token[];
  private current = 0;
  private vars: Record<string, number>;

  constructor(tokens: Token[], vars: Record<string, number>) {
    this.tokens = tokens;
    this.vars = vars;
  }

  private peek(): Token {
    return this.tokens[this.current] ?? { type: "EOF", value: "", pos: 0 };
  }

  private advance(): Token {
    const t = this.peek();
    if (this.current < this.tokens.length) {
      this.current++;
    }
    return t;
  }

  private match(...types: TokenType[]): boolean {
    const t = this.peek();
    if (types.includes(t.type)) {
      this.advance();
      return true;
    }
    return false;
  }

  parse(): number {
    const val = this.expression();
    if (this.peek().type !== "EOF") {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos + 1}`);
    }
    return val;
  }

  // Precedence:
  // 1. Additive (+, -)
  // 2. Multiplicative (*, /, %)
  // 3. Power (^)
  // 4. Unary (+, -)
  // 5. Primary (Number, Ident / Variable, Function call, Parentheses)

  private expression(): number {
    let left = this.term();

    while (this.peek().type === "OP" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.advance().value;
      const right = this.term();
      if (op === "+") left += right;
      else left -= right;
    }

    return left;
  }

  private term(): number {
    let left = this.power();

    while (
      this.peek().type === "OP" &&
      (this.peek().value === "*" || this.peek().value === "/" || this.peek().value === "%")
    ) {
      const op = this.advance().value;
      const right = this.power();
      if (op === "*") {
        left *= right;
      } else if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        left /= right;
      } else if (op === "%") {
        if (right === 0) throw new Error("Modulo by zero");
        left %= right;
      }
    }

    return left;
  }

  private power(): number {
    let left = this.unary();

    if (this.peek().type === "OP" && this.peek().value === "^") {
      this.advance();
      // Right-associative exponentiation
      const right = this.power();
      left = Math.pow(left, right);
    }

    return left;
  }

  private unary(): number {
    if (this.peek().type === "OP" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.advance().value;
      const operand = this.unary();
      return op === "-" ? -operand : operand;
    }

    return this.primary();
  }

  private primary(): number {
    const token = this.peek();

    if (token.type === "NUMBER") {
      this.advance();
      const num = Number(token.value);
      if (Number.isNaN(num)) {
        throw new Error(`Invalid number '${token.value}' at position ${token.pos + 1}`);
      }
      return num;
    }

    // Function call or Variable
    if (token.type === "IDENT") {
      this.advance();
      const name = token.value;

      // Check if function call (followed by LPAREN)
      if (this.peek().type === "LPAREN") {
        this.advance(); // consume '('
        const args: number[] = [];

        if (this.peek().type !== "RPAREN") {
          args.push(this.expression());
          while (this.match("COMMA")) {
            args.push(this.expression());
          }
        }

        if (!this.match("RPAREN")) {
          throw new Error(`Expected ')' after function arguments for '${name}'`);
        }

        const fn = MATH_FUNCTIONS[name];
        if (!fn) {
          throw new Error(`Unknown function '${name}' at position ${token.pos + 1}`);
        }

        return fn(...args);
      }

      // Variable lookup
      if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
        return this.vars[name] ?? 0;
      }

      throw new Error(`Unknown variable '${name}' at position ${token.pos + 1}`);
    }

    // Parenthesized expression
    if (this.match("LPAREN")) {
      const val = this.expression();
      if (!this.match("RPAREN")) {
        throw new Error("Missing closing parenthesis ')'");
      }
      return val;
    }

    throw new Error(`Unexpected token '${token.value || "end of input"}' at position ${token.pos + 1}`);
  }
}

/**
 * Evaluates a mathematical formula with given variables.
 */
export function evaluateFormula(formula: string, variables: PricingVariables): EvaluationResult {
  if (!formula || !formula.trim()) {
    return { success: false, error: "Formula cannot be empty", value: 0 };
  }

  const cleanFormula = formula.trim();
  const { tokens, error: tokenError } = tokenize(cleanFormula);
  if (tokenError) {
    return { success: false, error: tokenError, value: 0 };
  }

  try {
    const parser = new Parser(tokens, variables);
    const value = parser.parse();

    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return { success: false, error: "Calculation produced NaN or Infinity", value: 0 };
    }

    return {
      success: true,
      value: Math.max(0, value),
      steps: {
        evaluatedExpression: cleanFormula,
        variables,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to evaluate formula",
      value: 0,
    };
  }
}

/**
 * Validates a formula string without needing live variable values.
 * Uses realistic test values to verify syntax and unknown variables.
 */
export function validateFormula(
  formula: string,
  allowedVariables: string[] = [
    "volume",
    "material_rate",
    "quality_mult",
    "infill_mult",
    "setup_fee",
    "min_print",
    "qty",
    "modeling_fee",
  ],
): { valid: boolean; error?: string } {
  if (!formula || !formula.trim()) {
    return { valid: false, error: "Formula cannot be empty" };
  }

  const dummyVars: PricingVariables = {
    volume: 50,
    material_rate: 8,
    quality_mult: 1,
    infill_mult: 1,
    setup_fee: 49,
    min_print: 99,
    qty: 1,
    modeling_fee: 0,
  };

  for (const v of allowedVariables) {
    if (!(v in dummyVars)) {
      dummyVars[v] = 1;
    }
  }

  const result = evaluateFormula(formula, dummyVars);
  return { valid: result.success, error: result.error };
}
