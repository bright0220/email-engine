import { logger } from '../../logger';
import { BaseValidator, ResultType } from '../base-validator';
import qs from 'qs';
import { delay } from '../../utils/delay';

interface AolResponse {
  errors?: {
    name: string;
    error: string;
  }[]
}

class AolValidator extends BaseValidator {
  protected getCookieUrl = 'https://login.aol.com/account/create?locale=en_CA&promocode=825329';
  protected validationUrl = 'https://login.aol.com/account/module/create?validateField=yid';

  async validate(email: string): Promise<ResultType> {
    logger.info({ message: 'Validating email', email, validator: 'aol' });
    const { cookies, inputs, userAgent } = await this.getAolData();
    logger.info({ message: 'Open page results', cookies, userAgent });

    const [username] = email.split('@');

    const body = qs.stringify({
      ...inputs,
      yid: username,
    });

    await delay(1000);

    let res = await this.tryValidate(cookies, userAgent, body);

    if (res.status !== 200) {
      res = await this.tryValidate(cookies, userAgent, body);
      if (res.status !== 200) {
        return ResultType.UNKNOWN;
      }
    }

    const result: AolResponse = await res.json();

    if (!result.errors) {
      return ResultType.UNKNOWN;
    }
    const error = result.errors.find((e) => e.name === 'yid');

    if (!error) {
      return ResultType.INVALID;
    }


    if (error.error === 'IDENTIFIER_EXISTS' || error.error === 'IDENTIFIER_NOT_AVAILABLE') {
      return ResultType.VALID;
    }

    return ResultType.UNKNOWN;
  }

  async tryValidate(cookies: string[], userAgent: string, body: string) {
    return this.fetch(this.validationUrl, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'accept-language': 'en,mn-MN;q=0.9,mn;q=0.8,en-US;q=0.7',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Host: 'login.aol.com',
        Cookie: cookies.join('; '),
        Origin: 'https://login.aol.com',
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: 'https://login.aol.com/account/create?',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      // agent: this.socksProxyAgent,
    });
  }
}

export const aol = new AolValidator();
