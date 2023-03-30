import { BaseMatcher } from '.';

class BlackListMatcher extends BaseMatcher {
  protected matchFunctions: ((text: string) => boolean)[] = [];
  protected patterns: RegExp[] = [
    // /^(554|522|553)/i,
    /ban(\s|ned|ning|n)(\s|ed)?|black(\s|ed|list)|defer|restrict?/i,
    /spamhaus|kill|prohibit(ed)?/i,
    /spam\s/i,
    /abused?\s/i,
    /blocked/i,
    /block\s/i,
    /not\s*(.)*allowed/i,
    /not\s*(.)*\s*accept?/i,
    /host\s*reject/i
  ]
}

export const blackListMatcher = new BlackListMatcher();