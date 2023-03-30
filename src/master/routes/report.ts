import { format } from '@fast-csv/format';
import { Request, Router } from "express";
import { FilterQuery, isValidObjectId, Types } from "mongoose";
import { Job, JobDocument } from "../../models/job";
import { Request as RequestCollection } from "../../models/request";
import { roleBasedEmails } from '../../utils/role-based-emails';
import { ResultType } from "../../worker/base-validator";

export function convertReason(reason?: string) {
  switch (reason) {
    case 'INVALID_VENDOR':
    case 'GREYLISTED':
    case 'UNKNOWN':
    case 'INVALID_VENDOR_RESPONSE':
    case 'CRASH':
    case 'ANTI_SPAM': 
      return 'UNKNOWN';
    case 'VALID':
      return 'VALID';
    case 'INVALID':
      return 'INVALID';
    case 'SPAMTRAP':
      return 'SPAMTRAP';
    case 'BLACKLISTED':
      return 'BLACKLISTED';
    case 'NO_MX_RECORD':
      return 'NO_MX_RECORD';
    case 'DOMAIN_NOT_FOUND':
      return 'DOMAIN_NOT_FOUND';
    case 'CONSUMER_NOTFOUND':
      return 'REJECTED_EMAIL';
    case 'INVALID_HOSTNAME':
      return 'INVALID_HOSTNAME';
    case 'TIMEOUT':
      return 'TIMEOUT';
    case 'CATCH_ALL':
      return 'CATCH_ALL';
    case 'INBOX_FULL':
      return 'INBOX_FULL';
    case 'RISKY':
      return 'RISKY';
    case 'DISPOSABLE':
      return 'DISPOSABLE';
    default:
      return 'UNKNOWN';
  }
}

export const reportsRouter = Router();

reportsRouter.get("/reports/:requestId", async (req: Request, res) => {
  const requestId = new Types.ObjectId(req.params.requestId);
  if (!isValidObjectId(requestId)) {
    return res.status(400).send('invalid request id');
  }
  const request = await RequestCollection.findById(requestId);
  if (!request) {
    return res.status(404).send('request not found');
  }

  const reason = req.query.reason as string;
  const headers = ['attempts', 'email', 'status', 'verificationResult', 'REASON', 'updatedAt', 'attemptCount', 'job detail'];
  if (request.hasExtra) {
    for (let i = 0; i < (request.extraColumnCount || 0); i++) {
      headers.push(`extra-${i}`);
    }
  }
  const stream = format({ delimiter: ';', headers });

  res.setHeader('Content-disposition', `attachment; filename=${requestId}.csv`);
  res.setHeader('Content-type', 'text/csv');
  stream.pipe(res);

  const filter: FilterQuery<JobDocument> = { request: requestId };
  if (reason) {
    filter.reason = reason;
  }

  Job.find(filter)
    .cursor()
    .on('data', (job: JobDocument) => {
      const attempts = (job.attempts || []).filter(attempt => attempt.reason !== 'CONSUMER_NOTFOUND');
      const attemptCount = attempts.length;
      // const attemptString = "\"" + attempts.map(attempt => `${attempt.ip} ${attempt.date.toISOString()} ${attempt.reason || ''}`).join('\n') + "\"";
      const email = job.email.replace("\\r", '').replace("\\r", '').replace("\\r", '').replace("\\r", '').trim();
      const jobDetailUrl = `http://95.216.198.65:3101/api/jobs/${job._id}`;
      let verificationResult: string | boolean | undefined = job.verificationResult;
      let reason: string | undefined = job.reason;
      if (job.reason === ResultType.CATCH_ALL.toString() || job.reason === ResultType.INBOX_FULL.toString()) {
        verificationResult = 'risky';
      } else if (verificationResult) {
        verificationResult = 'deliverable';
      } else {
        verificationResult = 'undeliverable';
      }
      const [prefix] = email.split('@');
      if (roleBasedEmails.includes(prefix)) {
        verificationResult = 'risky'
        reason = 'Role'
      } else {
        reason = convertReason(job.reason);
      }
      const getJobAttemptsUrl = `http://95.216.198.65:3101/api/jobs/${job._id}/attempts`;
      const row = [getJobAttemptsUrl, email, job.status, verificationResult, reason, job.updatedAt.toISOString(), attemptCount, jobDetailUrl];
      if (request.hasExtra) {
        for (let i = 0; i < (request.extraColumnCount || 0); i++) {
          row.push(job.extra ? job.extra[i] : '');
        }
      }
      stream.write(row);
    })
    .on('end', () => {
      stream.end();
    })
});