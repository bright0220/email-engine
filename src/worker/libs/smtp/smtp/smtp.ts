import net from 'net';
import { blackListMatcher } from '../../../matchers/BlackListMatcher';
import { greyListMatcher } from '../../../matchers/GreyListMatcher';
import { invalidMatcher } from '../../../matchers/InvalidMatcher';
import { OutputFormat, createOutput } from '../output/output';
import { hasCode, ErrorCodes } from './errorCodes';

const log = (...args: unknown[]) => {
  if (process.env.DEBUG === 'true') {
    console.log(...args);
  }
};

const { IP, RDNS } = process.env;

const handleResponse = (msg: Buffer, socket: net.Socket) => {
  const [code] = Object.typedKeys(ErrorCodes).filter((x) => hasCode(msg, x));

  if ([421, 450, 451, 452].includes(code)) {
    socket.emit('fail', {
      reason: code,
      error: code,
      greylist: true,
    });

    return;
  }

  // if ([550].includes(code)) {
  //   socket.emit('fail', {
  //     reason: code,
  //     error: code,
  //     invalid: true,
  //   });
  //   return;
  // }

  if ([552].includes(code)) {
    socket.emit('fail', {
      reason: code,
      error: code,
      inboxfull: true,
    });

    return;
  }

  if ([552, 553].includes(code)) {
    socket.emit('fail', {
      reason: code,
      error: code,
      invalid: true,
    });
    return;
  }

  const isInvalid = invalidMatcher.match(msg.toString());

  if (isInvalid) {
    socket.emit('fail', {
      reason: code,
      error: code,
      invalid: true,
    });

    return;
  }

  const isBlackListed = blackListMatcher.match(msg.toString());

  if (isBlackListed) {
    socket.emit('fail', {
      reason: code,
      error: code,
      blacklist: true,
    });

    return;
  }

  const isGreyListed = greyListMatcher.match(msg.toString());

  if (isGreyListed) {
    socket.emit('fail', {
      reason: code,
      error: code,
      greylist: true,
    });

    return;
  }

  socket.emit('fail', {
    reason: code,
    error: code,
  });
};

export const checkSMTP = async (
  sender: string,
  recipient: string,
  exchange: string
): Promise<{ output: OutputFormat; messages: string[]; blacklist?: boolean; greylist?: boolean; invalid?: boolean; catchall?: boolean, inboxfull?: boolean, timeout?: boolean }> => {
  const timeout = 1000 * 20; // 20 seconds
  return new Promise((r) => {
    const messages: string[] = [];
    let receivedData = false;
    const socket = net.createConnection({
      host: exchange,
      port: 25,
      localAddress: IP,
    });
    socket.setEncoding('ascii');
    socket.setTimeout(timeout);
    socket.on('error', (error) => {
      log('error', error);
      socket.emit('fail', {
        error,
        greylist: true,
      });
    });
    socket.on('close', (hadError) => {
      if (!receivedData && !hadError) {
        socket.emit('fail', {
          error: 'Mail server closed connection without sending any data.',
          greylist: true,
        });
      }
    });
    socket.once('fail', ({ error: code, blacklist, greylist, invalid, catchall, inboxfull, timeout }) => {
      messages.push('failed: ' + code);
      r({ output: createOutput('smtp', code), messages, blacklist, greylist, invalid, catchall, inboxfull, timeout });
      if (socket.writable && !socket.destroyed) {
        socket.write(`quit\r\n`);
        socket.end();
        socket.destroy();
      }
    });

    socket.on('success', () => {
      messages.push('success');
      if (socket.writable && !socket.destroyed) {
        socket.write(`quit\r\n`);
        socket.end();
        socket.destroy();
      }
      r({ output: createOutput(), messages });
    });

    const commands = [`helo ${RDNS}\r\n`, `mail from: <${sender}>\r\n`, `rcpt to: <${recipient}>\r\n`];
    let i = 0;
    socket.on('next', () => {
      if (i < 3) {
        if (socket.writable) {
          const command = commands[i++];
          messages.push(command); // for debugging steps
          socket.write(command);
        } else {
          socket.emit('fail', {
            error: 'SMTP communication unexpectedly closed.',
            greylist: true,
          });
        }
      } else {
        socket.emit('success');
      }
    });

    socket.on('timeout', () => {
      socket.emit('fail', {
        error: 'SMTP connection timed out.',
        timeout: true,
      });
    });

    socket.on('connect', () => {
      socket.on('data', (msg) => {
        receivedData = true;
        messages.push(msg.toString()); // for debugging steps
        log('data', msg);
        if (hasCode(msg, 220) || hasCode(msg, 250)) {
          socket.emit('next', msg);
        } else {
          handleResponse(msg, socket);
        }
      });
    });
  });
};
