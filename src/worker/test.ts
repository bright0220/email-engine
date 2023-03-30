import { aol, gmail, yahoo, custom, outlook, mailru } from './validators';
import { chrome } from './services/chrome.service';
import { logger } from '../logger';
import { redis } from '../utils/redis';
import { invalidMatcher } from './matchers/InvalidMatcher';
import { blackListMatcher } from './matchers/BlackListMatcher';
import { getBestMx } from './libs/smtp/dns/dns';
import { checkSMTP } from './libs/smtp/smtp/smtp';
import validate from './libs/smtp';

process.env.HEADLESS_HOST = 'http://localhost:3102';

const emails = [
  "ariswillam2001@gmail.com",
  "professorab7@gmail.com",
  "waqarsyed351@gmail.com",
  "biofit991@gmail.com",
  "leotechclubus@gmail.com",
  "automationtry@gmail.com",
];

const checkGmail = async (email: string) => {
  const result = await gmail.validate(email);
  console.log(email, ': ', result);
};

const testMatcher = async () => {
  const str = '550 5.1.1 suS6oL4egFSnb Adresse d au moins un destinataire invalide. Invalid recipient. OFR_416 [416]\r\n'
  const str1 = '550 opmta1mti33nd1 smtp.orange.fr svxsoAJqydXC2 Adresse IP source bloquee pour incident de spam. Client host blocked for spamming issues. OFR006_101 Ref http://r.orange.fr/r/Oassistance_adresserejetee?ec=OFR006_101&amp;ip=5.196.195.202 [101]\r\n'

  const invalid = invalidMatcher.match(str1);
  const blackList = blackListMatcher.match(str1);

  console.log({ invalid, blackList });
}

async function main(): Promise<void> {
  // await redis.connect();
  // await chrome.launch();
  // console.log('start');
  // const result10 = await custom.validateCustom('more29ice@gmail.com');
  // console.log('end', result10);
  // await chrome.close();

  // await Promise.all(emails.map(checkGmail));

  // testMatcher();
  let mx = await getBestMx('morrens.skynet.be');
  console.log('morrens.skynet.be', mx);
  console.log(await validate('jacques.morrens@morrens.skynet.be'));
  // mx = await getBestMx('stas-be.skynet.be');
  // mx = await getBestMx('pop.skynet.be');
  // console.log('pop.skynet.be', mx);
}

main();