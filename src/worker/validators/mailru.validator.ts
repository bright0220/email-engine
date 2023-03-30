import { logger } from '../../logger';
import { BaseValidator, ResultType } from '../base-validator';
import QueryString from 'qs';
import { config } from '../../config';

class MailruValidator extends BaseValidator {
  protected getCookieUrl = 'https://account.mail.ru/signup';
  protected validationUrl = 'https://account.mail.ru/api/v1/user/exists';

  async validate(email: string): Promise<ResultType> {
    logger.trace({ message: 'Validating email', email, validator: 'mailru' });
    const userAgent = config.SHARED_USER_AGENT;
    const cookieResult = await this.fetch(this.getCookieUrl, { method: 'GET', headers: { 'User-Agent': userAgent } });
    const res = await this.fetch(this.validationUrl, {
      body: QueryString.stringify({ email }),
      method: 'POST',
      headers: { 'User-Agent': userAgent, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookieResult.headers.get('set-cookie') || '' },
      // agent: this.socksProxyAgent,
    });
    const json = await res.json();
    if (res.status === 200) {
      return json.body.exists ? ResultType.VALID : ResultType.INVALID;
    }
    return ResultType.UNKNOWN;
  }
}

export const mailru = new MailruValidator();
