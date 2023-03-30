import { BaseMatcher } from '.';

export class GreyListMatcher extends BaseMatcher {
  protected matchFunctions: ((text: string) => boolean)[] = [];
  protected patterns: RegExp[] = [
    /421|450|451|452/i,
    /greylist|sbl|rbl/i,
    /try\s*(again)?\s*later/i,
    /later\stime/i,
    /prevent(s|ing|ed)/i,
    /because|unfortunate|junk|down|temporar(il)?y|try.*(again|later)/i,
    /(recipient|host|ip)?.*listed/i,
    /too\s*(many|much|busy|quickly|fast)/i,
    /(server|service)\s*((not\\s*available)|((too|very|seems)?\s*busy))/i,
    /(access|((query|relay)(ing)?) )\s*denied/i,
    /command\s*unrecognized/i,
    /command.*not.*recognized/i,
    /unrecognized\s*command/i,
    /not\s*implemented/i,
    /protocol\s*err/i
  ];
}

export const greyListMatcher = new GreyListMatcher();