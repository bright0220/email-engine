import fs from 'fs';
import path from 'path';
import es from 'event-stream';
import { spamtrap } from '../services/spamtrap';
import { redis } from '../utils/redis';

export async function start () {
  await redis.connect();
  const spamtrapsPath = path.resolve('/assets/spamtraps.txt');
  console.log(spamtrapsPath);
  let count = 0;
  const stream = fs.createReadStream(spamtrapsPath)
    .pipe(es.split())
    .pipe(es.mapSync((line: string) => {
      // DO NOT CONSOLE LOG HERE
      if (line.includes('@yahoo')) {
        stream.pause();
        count += 1;
        redis.client.sRem("spamtrap", line).then(() => {
          stream.resume();
        });
      }
    }))
    .on('error', (err: Error) => {
      console.log('Error while reading file.', err);
    })
    .on('end', () => {
      console.log('Read entire file.', count);
    });
}
start();