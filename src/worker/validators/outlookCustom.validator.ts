import { logger } from "../../logger";
import { BaseValidator, ResultType } from "../base-validator";



class OutlookCustomValidator extends BaseValidator {

  protected getCookieUrl = 'https://login.live.com/';
  // protected validationUrl = 'https://login.live.com/GetCredentialType.srf';
  protected validationUrl = 'https://login.microsoftonline.com/common/GetCredentialType';

  async validate(email: string): Promise<ResultType> {
    logger.trace({ message: 'Validating email', email, validator: 'mailru' });
    const { cookies, userAgent, flowToken } = await this.getOutlookData();

    if (!flowToken) {
      return ResultType.INVALID_VENDOR;
    }

    const uaid = cookies.find(c => c.startsWith('uaid='));

    if (!uaid) {
      return ResultType.INVALID_VENDOR;
    }

    const cookie = cookies.join('; ');
    const result = await this.fetch(this.validationUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'User-Agent': userAgent,
        'Content-Type': 'application/json',
        'client-request-id': uaid,
      },
      body: JSON.stringify({
        uaid,
        flowToken,
        username: email,
        isOtherIdpSupported: false,
        checkPhones: false,
        isRemoteNGCSupported: true,
        isCookieBannerShown: false,
        isFidoSupported: false,
      }),
      // agent: this.socksProxyAgent,
    });

    if (result.status !== 200) {
      return ResultType.INVALID_VENDOR;
    }
    const json = await result.json();

    if (json.IfExistsResult === 1) {
      return ResultType.INVALID;
    }
    if (json.IfExistsResult === 0) {
      return ResultType.VALID;
    }

    return ResultType.UNKNOWN;
  }
}

export const outlookCustom = new OutlookCustomValidator();