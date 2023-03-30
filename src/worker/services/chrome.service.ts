import fetch from 'node-fetch';
import { config } from '../../config';
import { REQUEST_ERRORS } from '../../headless/master';
import { AolResponse } from '../../headless/routes/aol';
import { OutlookResponse } from '../../headless/routes/outlook';
import { YahooResponse } from '../../headless/routes/yahoo';
import { logger } from '../../logger';

class Chrome {
  constructor(protected host: string) { }
  async renewTorSession(torId: string) {
    const res = await fetch(`${this.host}/api/${torId}/tor/renew`, { method: 'POST' });
    
    if (res.status !== 200) {
      logger.error({ message: 'Error renewing TOR session' });
    }
  }
  async aol(torId: string, url: string) {
    let res = await fetch(`${this.host}/api/${torId}/open/aol`, {
      method: 'POST',
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 429) {
      await this.renewTorSession(torId);
      res = await fetch(`${this.host}/api/${torId}/open/aol`, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (res.status === 500) {
      res = await fetch(`${this.host}/api/${torId}/open/aol`, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (res.status === 500) {
      await this.renewTorSession(torId);
      res = await fetch(`${this.host}/api/${torId}/open/aol`, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (res.status !== 200) {
      throw new Error('Error opening AOL');
    }
    const data: AolResponse = await res.json();
    return data;
  }

  async yahoo(torId: string, url: string) {
    let res = await fetch(`${this.host}/api/${torId}/open/yahoo`, {
      method: 'POST',
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 429) {
      await this.renewTorSession(torId);
      res = await fetch(`${this.host}/api/${torId}/open/yahoo`, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (res.status === 500) {
      res = await fetch(`${this.host}/api/${torId}/open/yahoo`, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (res.status === 500) {
      res = await fetch(`${this.host}/api/${torId}/open/yahoo`, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (res.status !== 200) {
      throw new Error('Error opening YAHOO');
    }
    const data: YahooResponse = await res.json();
    return data;
  }

  async outlook(torId: string, url: string) {
    let res = await fetch(`${this.host}/api/${torId}/open/outlook`, {
      method: 'POST',
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 430) {
      throw new Error(REQUEST_ERRORS.CHROME_USAGE_LIMIT_EXCEEDED);
    }

    if (res.status !== 200) {
      throw new Error('Error opening OUTLOOK');
    }
    const data: OutlookResponse = await res.json();
    return data;
  }
}

export const chrome = new Chrome(config.HEADLESS_HOST);