import fs from 'fs';
import path from 'path';
import { MailVerificationRequestedEvent } from "../broker";
import { ResultType } from '../worker/base-validator';
import { delay } from './delay';
import { v4 } from 'uuid';

export function randomBoolean() {
  return Math.random() >= 0.5;
}

export const finishes = [true, true, true, true, true, true, true, true, false];
export const valids = [true, true, true, true, false, false];

export const reasons = [
  ResultType.BLACKLISTED,
  ResultType.GREYLISTED,
  ResultType.GREYLISTED,
  ResultType.GREYLISTED,
  ResultType.INVALID_HOSTNAME,
  ResultType.INVALID_HOSTNAME,
  ResultType.INVALID_HOSTNAME,
  ResultType.INVALID_HOSTNAME,
  ResultType.INVALID_HOSTNAME,
];

export async function makeMockVerificationResult(
  data: MailVerificationRequestedEvent["data"]
): Promise<{
  finished: boolean;
  reason?: ResultType;
  valid?: boolean;
}> {
  const finished = finishes[Math.floor(Math.random() * finishes.length)];
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  const valid = valids[Math.floor(Math.random() * valids.length)];

  const realLifeDelay = randomIntFromInterval(300, 2 * 1000);
  await delay(realLifeDelay);
  return { finished, reason, valid };
}

const assetName = 'mix-aol-yahoo.csv'

export function getMockEmails(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, `../../assets/${assetName}`), "utf8", (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data.replace(/(?:\\[r])+/g, "").split("\n"));
    });
  });
}

export function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function makeRandomEmail(domain: string) {
  return `em${v4().split('-').shift()}@${domain}`;
}