import { Router } from 'express';
import Joi from 'joi';
import { Job, JobProps, JobStatus } from '../../models/job';
import { Request } from '../../models/request';
import { spamtrap, riskySpamtrap } from '../../services/spamtrap';
import { ResultType } from '../../worker/base-validator';
import { produceVerificationRequest } from '../helpers/producer';
import { auth } from '../middlewares/auth';
import { faker } from '@faker-js/faker';
import { disposableDomains } from '../../utils/disposable-domains';

interface DataRow {
  email: string;
  extra?: { [key: string]: string; };
}

const emailValidator = Joi.string().email().required();

const delimiter = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

export const uploadRouter = Router();

uploadRouter.post('/upload', auth, async (req, res) => {
  const file = req.files?.file;

  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  if (Array.isArray(file)) {
    return res.status(400).send('Multiple files uploaded');
  }



  const rows = file.data.toString().split('\n');
  const [headerRow, row2, ...rest] = rows;

  const headers = headerRow.split(delimiter);

  const hasHeader = headers
    .map(col => col.replace(/"/g, ''))
    .filter(col => emailValidator.validate(col).error === undefined).length === 0;

  const bodyRows = hasHeader ? [row2, ...rest] : rows;

  const columns = row2.split(delimiter);
  const hasMultipleColumns = columns.length > 1;
  const emailColumn = columns
    .map(col => col.replace(/"/g, ''))
    .findIndex((column) => emailValidator.validate(column).error === undefined);
  console.log('hasMultipleColumns', hasMultipleColumns);
  console.log('emailColumn', emailColumn);
  console.log('row2', row2)

  const dataRows: DataRow[] = bodyRows.filter(i => i.length).map(row => {
    if (hasMultipleColumns) {
      const columns = row.split(delimiter)
        .map(col => col.replace(/"/g, ''));
      const emailColData = columns[emailColumn];
      console.log('columns', columns);
      console.log('emailColData', emailColData);
      const extra = columns.filter((_, index) => index !== emailColumn).reduce((acc, column, index) => {
        acc[index] = column;
        return acc;
      }, {} as { [key: string]: string; });
      return {
        email: emailColData.toLowerCase().replace("\\r", '').replace("\\r", '').replace("\\r", '').replace("\\r", '').trim(),
        extra,
      }
    } else {
      return {
        email: row.toLowerCase()
          .replace(/"/g, '')
          .replace("\\r", '')
          .replace("\\r", '')
          .replace("\\r", '')
          .replace("\\r", '')
          .trim()
      }
    }
  });

  const request = new Request({
    name: `${faker.word.adjective()} ${faker.word.noun()}`,
    uploadedFilename: file.name,
    hasExtra: hasMultipleColumns,
    extraColumnCount: columns.length - 1,
  });


  const filteredEmails: DataRow[] = [];
  const spamtrapEmails: DataRow[] = [];
  const riskySpamtrapEmails: DataRow[] = [];
  const disposableEmails: DataRow[] = [];

  for await (const dataRow of dataRows) {
    const { email } = dataRow;
    const [, domain] = email.split('@');
    if (disposableDomains.includes(domain)) {
      disposableEmails.push(dataRow);
    } else if (await riskySpamtrap.contains(email)) {
      riskySpamtrapEmails.push(dataRow);
    } else if (await spamtrap.contains(email)) {
      spamtrapEmails.push(dataRow);
    } else {
      filteredEmails.push(dataRow);
    }
  }

  await Job.insertMany(riskySpamtrapEmails.filter(dataRow => dataRow.email).map((dataRow) => ({ email: dataRow.email, request, status: JobStatus.COMPLETED, verificationResult: false, error: 'RISKY SPAMTRAP', reason: ResultType.RISKY, extra: dataRow.extra })));
  await Job.insertMany(spamtrapEmails.filter(dataRow => dataRow.email).map((dataRow) => ({ email: dataRow.email, request, status: JobStatus.COMPLETED, verificationResult: false, error: 'SPAMTRAP', reason: ResultType.SPAMTRAP, extra: dataRow.extra })));
  await Job.insertMany(disposableEmails.filter(dataRow => dataRow.email).map((dataRow) => ({ email: dataRow.email, request, status: JobStatus.COMPLETED, verificationResult: false, error: 'DISPOSEABLE', reason: ResultType.DISPOSABLE, extra: dataRow.extra })));

  const jobs: JobProps[] = filteredEmails
    .filter((dataRow) => emailValidator.validate(dataRow.email).error === undefined)
    .map((dataRow) => {
      return {
        email: dataRow.email,
        request: request._id,
        status: JobStatus.REQUESTED,
        extra: dataRow.extra,
      };
    });

  const jobList = await Job.insertMany(jobs);
  const totalCount = jobList.length + riskySpamtrapEmails.length + spamtrapEmails.length + disposableEmails.length;
  const completedCount = riskySpamtrapEmails.length + spamtrapEmails.length + disposableEmails.length;
  request.set({ totalCount, completedCount });

  await request.save();

  res.send({
    _id: request._id,
    message: 'verification request queued!!',
    progress: `http://95.216.198.65:3101/api/requests/${request._id}/progress`,
    report: `http://95.216.198.65:3101/api/reports/${request._id}`,
  });

  for await (const job of jobList) {
    await produceVerificationRequest(job.id, job.email, false);
  }
});
