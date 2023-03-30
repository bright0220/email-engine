import tor from 'tor-request';
import { config } from '../../config';
import { controlPorts } from './socks';

if (!config.TOR_CONTROL_SECRET) {
  throw new Error('TOR_CONTROL_SECRET is not defined');
}

tor.TorControlPort.password = config.TOR_CONTROL_SECRET;

export async function renewTorSession(torId: string): Promise<void> {
  const controlPort = controlPorts[torId];
  return new Promise((resolve, reject) => {
    tor.TorControlPort.port = controlPort;

    tor.renewTorSession((err: any) => {
      if (err) {
        console.log('Error renewing tor session', err);
        return reject(err);
      }
      resolve();
    })
  });
}