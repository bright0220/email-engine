const YAHOO_EXTENSIONS = ['yahoo', 'ymail'];

export function isYahoo(domain: string) {
  const [ext] = domain.split('.');
  return YAHOO_EXTENSIONS.includes(ext)
}

export function isSkynet(domain: string) {
  return domain.includes('skynet');
}

export function isHotmail(domain: string) {
  return domain.includes('hotmail.');
}

export function isOutlook(domain: string) {
  return domain.includes('outlook.');
}

export function isMsn(domain: string) {
  return domain.includes('msn.');
}
