/** Thrown where a `switch` over a union has no case for a value the type says cannot happen: a bug in the code, not in the data. */
export class ExhaustiveCheckError extends Error {
  constructor(value: never) {
    super(`Unhandled case: ${JSON.stringify(value)}`);
    this.name = 'ExhaustiveCheckError';
  }
}
