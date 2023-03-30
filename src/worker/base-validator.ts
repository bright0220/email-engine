import { chrome } from "./services/chrome.service";
import nodeFetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from "../config";
import { SocksProxyAgent } from "socks-proxy-agent";
import { logger } from "../logger";
import { FetchBody } from "../headless/worker";
import { OutlookResponse } from "../headless/routes/outlook";

export enum ResultType {
  VALID = 'VALID',
  INVALID = 'INVALID',
  INVALID_VENDOR = 'INVALID_VENDOR',
  ANTI_SPAM = 'ANTI_SPAM',
  SPAMTRAP = 'SPAMTRAP',
  BLACKLISTED = 'BLACKLISTED',
  GREYLISTED = 'GREYLISTED',
  UNKNOWN = 'UNKNOWN',
  NO_MX_RECORD = 'NO_MX_RECORD',
  DOMAIN_NOT_FOUND = 'DOMAIN_NOT_FOUND',
  CONSUMER_NOTFOUND = 'CONSUMER_NOTFOUND',
  INVALID_HOSTNAME = 'INVALID_HOSTNAME',
  TIMEOUT = 'TIMEOUT',
  CATCH_ALL = 'CATCH_ALL',
  INBOX_FULL = 'INBOX_FULL',
  INVALID_VENDOR_RESPONSE = 'INVALID_VENDOR_RESPONSE',
  CRASH = 'CRASH',
  BOUNCED = 'BOUNCED',
  RISKY = 'RISKY',
  DISPOSABLE = 'DISPOSABLE',
}
/**
 * Base email validator class.
 */
export abstract class BaseValidator {

  protected abstract getCookieUrl: string;
  protected httpsProxyAgent: HttpsProxyAgent = new HttpsProxyAgent(config.HTTPS_PROXY_SERVER);
  protected socksProxyAgent: SocksProxyAgent = new SocksProxyAgent(config.SOCKS_PROXY_SERVER);

  /**
   * Validate email.
   * @param email Email to validate.
   */
  abstract validate(email: string): Promise<ResultType>;

  public renewTorSession() {
    return chrome.renewTorSession(config.TOR_ID);
  }


  protected async getAolData() {
    return chrome.aol(config.TOR_ID, this.getCookieUrl);
  }

  protected async getYahooData() {
    return chrome.yahoo(config.TOR_ID, this.getCookieUrl);
  }

  protected async getOutlookData() {
    const outlookData = await chrome.outlook(config.TOR_ID, this.getCookieUrl);

    return outlookData;
  }

  async fetch(url: string, options: { method: string; headers: { [key: string]: string }; body?: string }) {
    const fetchBody: FetchBody = { url, method: options.method, headers: options.headers };

    if (options.body) {
      fetchBody.body = options.body;
    }

    logger.trace({ message: 'fetch', ...fetchBody });
    return nodeFetch(`${config.HEADLESS_HOST}/api/${config.TOR_ID}/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fetchBody),
    });
  }
}