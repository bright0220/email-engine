import { REQUEST_ERRORS } from "../../headless/master";
import { OutlookResponse } from "../../headless/routes/outlook";
import { logger } from "../../logger";
import { BaseValidator, ResultType } from "../base-validator";



class OutlookValidator extends BaseValidator {

  protected getCookieUrl = 'https://login.live.com/';
  protected validationUrl = 'https://login.live.com/GetCredentialType.srf';

  protected outlookMaxBadResponses = 6;
  protected outlookMaxBadAttempts = 4;
  protected outlookBadAttempts = 0;
  protected outlookBadResponses = 0;
  protected outlookCachedData: OutlookResponse | null = null;

  public increaseOutlookBadAttempts() {
    this.outlookBadAttempts++;
  }

  public increaseOutlookBadResponses() {
    this.outlookBadResponses++;
  }

  public resetOutlookBadResponses() {
    this.renewTorSession();
    this.outlookBadResponses = 0;
  }

  protected async cacheOutlookData(outlookData: OutlookResponse) {
    this.outlookCachedData = outlookData;
    this.outlookBadAttempts = 0;
  }

  protected async getCachedOutlookData() {
    if (this.outlookCachedData && this.outlookBadAttempts < this.outlookMaxBadAttempts) {
      return this.outlookCachedData;
    }

    const outlookData = await this.getOutlookData();

    return outlookData;
  }

  async validate(email: string): Promise<ResultType> {
    logger.trace({ message: 'Validating email', email, validator: 'mailru' });

    if (this.outlookBadResponses > this.outlookMaxBadResponses) {
      this.resetOutlookBadResponses();
      return ResultType.BOUNCED;
    }

    try {
      const { cookies, userAgent, flowToken } = await this.getCachedOutlookData();

      if (!flowToken) {
        return ResultType.INVALID_VENDOR;
      }

      const uaid = cookies.find(c => c.startsWith('uaid='));

      if (!uaid) {
        return ResultType.INVALID_VENDOR;
      }

      this.cacheOutlookData({ cookies, userAgent, flowToken });

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

      if (result.status === 430) {
        return ResultType.BOUNCED;
      }

      if (result.status === 429) {
        this.renewTorSession();
        return ResultType.ANTI_SPAM;
      }

      if (result.status !== 200) {

        console.log('result.status', result.status);
        try {
          const json = await result.text();
          console.log('json', json);
        } catch (err) {
          console.log('err', err);
        }

        this.increaseOutlookBadAttempts();

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
    } catch (err: any) {
      if (err.message === REQUEST_ERRORS.CHROME_USAGE_LIMIT_EXCEEDED) {
        return ResultType.BOUNCED;
      }

      return ResultType.UNKNOWN;
    }
  }
}

export const outlook = new OutlookValidator();