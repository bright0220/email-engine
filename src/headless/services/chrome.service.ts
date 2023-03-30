import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from '../../logger';

puppeteer.use(StealthPlugin());

interface LaunchOptions {
  hasProxy?: boolean;
  socksProxy?: string;
  httpsProxy?: string;
}

class Chrome {
  _browser: Browser | null = null;
  public usage: number = 0;
  protected options: LaunchOptions | null = null;
  constructor() { }

  protected increaseUsage() {
    logger.trace({ message: 'Increasing browser usage', usage: this.usage });
    this.usage++;
  }
  protected resetUsage() {
    logger.trace({ message: 'Resetting browser usage', usage: this.usage });
    this.usage = 0;
  }

  async launch(options: LaunchOptions = {}) {
    this.options = options;
    if (this._browser) {
      logger.trace({ message: 'Browser is already running' });
      return;
    }

    logger.trace({ message: 'Launching browser' });
    const args = [
      '--no-sandbox',
      '--no-zygote',
      '--single-process'
    ]
    if (options.hasProxy && options.socksProxy) {
      args.push(`--proxy-server=${options.socksProxy}`);
    }
    if (options.hasProxy && options.httpsProxy) {
      args.push(`--proxy-server=${options.httpsProxy}`);
    }

    this._browser = await puppeteer.launch({
      args,
      headless: true,
      // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      executablePath: '/usr/bin/chromium-browser',
    });
  }

  protected get browser() {
    if (!this._browser) {
      throw new Error('Browser is not running');
    }
    return this._browser;
  }

  /**
   * it open a new page and return cookies and input names from form
   */
  async openPage(url: string): Promise<{ cookies: string[], inputs: { [key: string]: string }, userAgent: string }> {
    const { cookies, evaluationResult, userAgent } = await this.openPageWithEvaluation<{ [key: string]: string }>(url, (p) => {
      return p.$$eval('form input', inputs => inputs.reduce((acc, input) => {
        acc[input.name] = input.value || '';
        return acc;
      }, {} as { [key: string]: string }));
    })
    return { cookies, inputs: evaluationResult, userAgent };
  }

  async openPageWithEvaluation<T>(url: string, evaluate: (p: Page) => Promise<T>) {
    const page = await this.browser.newPage();
    try {
      logger.trace({ message: 'Opening page', url });
      this.increaseUsage();
      const navigation = await page.goto(url, { waitUntil: 'load', timeout: 0 });
      if (!navigation) {
        throw new Error('Navigation failed');
      }
      const userAgent = navigation.request().headers()['user-agent'];
      const cookies = (await page.cookies()).map(cookie => `${cookie.name}=${cookie.value}`)
      const evaluationResult = await evaluate(page);
      return {
        cookies,
        userAgent,
        evaluationResult,
      };
    } finally {
      await page.close();
    }
  }

  async close() {
    logger.trace({ message: 'Closing browser' });
    await this._browser?.close();
  }
}

export const chrome = new Chrome();
