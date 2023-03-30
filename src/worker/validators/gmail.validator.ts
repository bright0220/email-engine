import { config } from "../../config";
import { logger } from "../../logger";
import { BaseValidator, ResultType } from "../base-validator";

class GmailValidator extends BaseValidator {

  protected getCookieUrl = '';
  protected validationUrl = 'https://mail.google.com/mail/gxlu';

  async validate(email: string): Promise<ResultType> {
    logger.trace({ message: 'Validating email', email, validator: 'gmail' });

    const userAgent = config.SHARED_USER_AGENT
    const url = this.validationUrl + '?email=' + email;
    const res = await this.fetch(url, {
      method: "GET",
      headers: {
        'User-Agent': userAgent,
      },
    })

    if (res.status === 430) {
      return ResultType.BOUNCED;
    }

    if (res.status === 429) {
      this.renewTorSession();
      return ResultType.BOUNCED;
    }

    if (res.status !== 204) {
      return ResultType.ANTI_SPAM;
    }
    logger.trace({ message: 'checking headers', headers: res.headers })
    return res.headers.get('set-cookie') ? ResultType.VALID : ResultType.INVALID;
  }
}

export const gmail = new GmailValidator();