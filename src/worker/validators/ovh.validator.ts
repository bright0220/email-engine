import { config } from "../../config";
import { logger } from "../../logger";
import { delay } from "../../utils/delay";
import { BaseValidator, ResultType } from "../base-validator";

class OvhValidator extends BaseValidator {

  protected getCookieUrl = '';
  protected validationUrl = 'https://msservices.eu.ovhapis.com/1.0/webmail/';

  async validate(email: string): Promise<ResultType> {
    logger.trace({ message: 'Validating email', email, validator: 'ovh' });
    const userAgent = config.SHARED_USER_AGENT
    const url = this.validationUrl + '?email=' + email;

    await delay(1000);

    const res = await this.fetch(url, {
      method: "GET",
      headers: {
        'User-Agent': userAgent,
      },
      // agent: this.socksProxyAgent,
    })

    if (res.status !== 200) {
      return ResultType.INVALID;
    }
    logger.trace({ message: 'checking headers', headers: res.headers })
    return ResultType.VALID
  }
}

export const ovh = new OvhValidator();