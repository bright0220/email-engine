import { renewTorSession } from './libs/tor'
import { socks } from './libs/socks'
import { chrome } from './services/chrome.service';
import { REQUEST_ERRORS, REQUEST_TYPES, WORKER_EVENTS } from './master';
import { config } from '../config';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { logger } from '../logger';

async function onReloadTor(): Promise<void> {
  try {
    process.send!(WORKER_EVENTS.RELOAD_TOR_STARTED)
    await renewTorSession(process.env.SOCK_ID!)
    process.send!(WORKER_EVENTS.RELOAD_TOR_FINISHED)
    process.exit(0)
  } catch (e: any) {
    process.send!(WORKER_EVENTS.RELOAD_TOR_FINISHED)
  }
}

function sendResponse(id: string, data: any) {
  process.send!({
    id: id,
    data: {
      data,
      error: null
    }
  })
}

function sendError(id: string, error: any) {
  process.send!({
    id: id,
    data: {
      data: null,
      error
    }
  })
}

async function aolHandler(id: string, body: any) {
  const url = body.url as string;

  if (chrome.usage >= config.MAX_BROWSER_USAGE) {
    sendError(id, REQUEST_ERRORS.CHROME_USAGE_LIMIT_EXCEEDED)
    process.exit(0)
  }

  try {
    const { cookies, inputs, userAgent } = await chrome.openPage(url)

    sendResponse(id, {
      cookies,
      inputs,
      userAgent
    })

  } catch (e: any) {
    sendError(id, e.message)
  }
}

async function yahooHandler(id: string, body: any) {
  const url = body.url as string;

  if (chrome.usage >= config.MAX_BROWSER_USAGE) {
    sendError(id, REQUEST_ERRORS.CHROME_USAGE_LIMIT_EXCEEDED)
    process.exit(0)
  }

  try {
    const { cookies, inputs, userAgent } = await chrome.openPage(url)

    sendResponse(id, {
      cookies,
      inputs,
      userAgent
    })

  } catch (e: any) {
    sendError(id, e.message)
  }
}

async function outlookHandler(id: string, body: any) {
  const url = body.url as string;

  if (chrome.usage >= config.MAX_BROWSER_USAGE) {
    sendError(id, REQUEST_ERRORS.CHROME_USAGE_LIMIT_EXCEEDED)
    process.exit(0)
  }

  try {
    const { cookies, userAgent, evaluationResult } = await chrome.openPageWithEvaluation<string>(url, (page) => {
      return page.$$eval('input[name="PPFT"]', inputs => inputs[0]?.value);
    })

    sendResponse(id, {
      cookies,
      userAgent,
      flowToken: evaluationResult
    })

  } catch (e: any) {
    sendError(id, e.message)
  }
}

export interface FetchBody {
  url: string;
  method: string;
  headers: { [key: string]: string };
  body?: string;
}

async function fetchHandler(id: string, requestBody: any) {
  const { url, method, headers, body } = requestBody as FetchBody;

  const socksProxyServer = socks[process.env.SOCK_ID!];
  const socksProxyAgent: SocksProxyAgent = new SocksProxyAgent(socksProxyServer);

  try {
    let result = await fetch(url, { method, headers, body, agent: socksProxyAgent });

    const cookie = result.headers.get('set-cookie');
    const contentType = result.headers.get('content-type');

    sendResponse(id, {
      status: result.status,
      cookie,
      contentType,
      body: contentType?.includes('application/json') ? await result.json() : await result.text()
    })

  } catch (e: any) {
    sendError(id, e.message)
  }
}

async function onRequest(message: any) {
  if (!message) {
    return
  }

  if (typeof message === 'string') {
    return
  }

  if (message.request) {
    const { request, body, id } = message;

    switch (request) {
      case REQUEST_TYPES.OUTLOOK:
        await outlookHandler(id, body)
        break;
      case REQUEST_TYPES.FETCH:
        await fetchHandler(id, body)
        break;
      case REQUEST_TYPES.AOL:
        await aolHandler(id, body)
        break;
      case REQUEST_TYPES.YAHOO:
        await yahooHandler(id, body)
        break;
      default:
        break;
    }
  }
}

async function main(): Promise<void> {
  logger.trace('Worker process starting', process.env.SOCK_ID)

  await chrome.launch({ hasProxy: true, socksProxy: socks[process.env.SOCK_ID!] });
  
  process.send!(WORKER_EVENTS.WORKER_READY)

  process.on('message', (message) => {
    logger.trace('Worker process received message', message)

    switch (message) {
      case REQUEST_TYPES.RELOAD_TOR:
        onReloadTor()
        break;
      case REQUEST_TYPES.RESTART_WORKER:
        process.exit(0)
      default:
        onRequest(message)
        break;
    }
  });
}

main()