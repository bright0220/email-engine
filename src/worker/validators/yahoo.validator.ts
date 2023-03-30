import { logger } from '../../logger';
import { BaseValidator, ResultType } from '../base-validator';
import qs from 'qs';
import { delay } from '../../utils/delay';

interface YahooResponse {
  errors?: {
    name: string;
    error: string;
  }[]
}

class YahooValidator extends BaseValidator {
  protected getCookieUrl = 'https://login.yahoo.com/account/create';
  protected validationUrl = 'https://login.yahoo.com/account/module/create?validateField=userId';

  async validate(email: string): Promise<ResultType> {
    logger.info({ message: 'Validating email', email, validator: 'yahoo' });
    const { cookies, inputs, userAgent } = await this.getYahooData();
    logger.info({ message: 'Open page results', cookies, userAgent });

    const [username] = email.split('@');

    const body = qs.stringify({
      ...inputs,
      userId: username
    });
    
    await delay(1000);

    const res = await this.fetch(this.validationUrl, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'accept-language': 'en,mn-MN;q=0.9,mn;q=0.8,en-US;q=0.7',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Host: 'login.yahoo.com',
        Cookie: cookies.join('; '),
        Origin: 'https://login.yahoo.com',
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: 'https://login.yahoo.com/account/create?',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      // agent: this.socksProxyAgent,
    });
    const result: YahooResponse = await res.json();
    if (!result.errors) {
      return ResultType.UNKNOWN;
    }

    const error = result.errors.find((e) => e.name === 'userId');

    if (!error) {
      return ResultType.INVALID;
    }

    if (error.error === 'IDENTIFIER_EXISTS') {
      return ResultType.VALID;
    }
    
    return ResultType.UNKNOWN;
  }
}

export const yahoo = new YahooValidator();
