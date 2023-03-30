export abstract class BaseMatcher {
  protected abstract patterns: RegExp[];
  protected abstract matchFunctions: ((text: string) => boolean)[];

  match(text: string): boolean {
    let result = this.patterns.some((pattern) => pattern.test(text));

    if (!result) {
      result = this.matchFunctions.some((matchFunction) => matchFunction(text));
    }

    return result;
  }
}
