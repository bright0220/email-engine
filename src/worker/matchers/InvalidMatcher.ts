import { BaseMatcher } from '.';

class InvalidMatcher extends BaseMatcher {
  protected matchFunctions: ((text: string) => boolean)[] = [];
  protected patterns: RegExp[] = [
    /(user|recipient).*addr.*(reject|defer)*/i,
    /(invalid|unknown)\s*(user|recipient)/i,
    /user.*unknown/i,
    /(user|recipient)?.*not.*found/i,
    /(you|user)?.*no.*(dns|email).*(entry|record)/i,
    /(user|recipient|dns|email)?.*not.*(found|resolve)/i,
    /(sorry.*)?no\\s*(mailbox|user)\\s*(found|here)/i,
    /account\\s*(is)?\\s*not\\s*allowed/i,
  ];
}

export const invalidMatcher = new InvalidMatcher();
