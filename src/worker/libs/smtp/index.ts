import { isEmail } from './regex/regex';
import { checkTypo } from './typo/typo';
import { getBestMx } from './dns/dns';
import { checkSMTP } from './smtp/smtp';
import { checkDisposable } from './disposable/disposable';
import { getOptions, ValidatorOptions } from './options/options';
import { OutputFormat, createOutput } from './output/output';
import './types';
import { ResultType } from '../../base-validator';

export async function validate(emailOrOptions: string | ValidatorOptions): Promise<OutputFormat> {
  const options = getOptions(emailOrOptions);
  const email = options.email;
  const result: OutputFormat = { valid: true, validators: {} };

  if (options.validateRegex) {
    const regexResponse = isEmail(email);
    if (regexResponse) {
      result.validators.regex = { valid: false, reason: regexResponse };
      result.valid = false;
      result.reason = regexResponse;
    } else {
      result.validators.regex = { valid: true };
    }
  }

  if (options.validateTypo) {
    const typoResponse = await checkTypo(email, options.additionalTopLevelDomains);
    if (typoResponse) {
      result.validators.typo = { valid: false, reason: typoResponse };
      result.valid = false;
      result.reason = typoResponse;
    } else {
      result.validators.typo = { valid: true };
    }
  }

  const domain = email.split('@')[1];

  if (options.validateDisposable) {
    const disposableResponse = await checkDisposable(domain);
    if (disposableResponse) {
      result.validators.disposable = { valid: false, reason: disposableResponse };
      result.valid = false;
      result.reason = disposableResponse;
    } else {
      result.validators.disposable = { valid: true };
    }
  }

  if (options.validateMx) {
    const mx = await getBestMx(domain);
    if (mx) {
      result.validators.mx = { valid: true };
      if (options.validateSMTP) {
        const { output: smtpResponse, messages, blacklist, greylist, invalid, inboxfull, catchall } = await checkSMTP(options.sender, email, mx.exchange);
        result.messages = messages;

        let customReason: ResultType = ResultType.UNKNOWN;
        if (inboxfull) {
          result.inboxfull = inboxfull
          customReason = ResultType.INBOX_FULL;
        }

        if (catchall) {
          result.catchall = catchall;
          customReason = ResultType.CATCH_ALL;
        }

        if (invalid) {
          result.invalid = invalid;
          customReason = ResultType.INVALID;
        }

        if (blacklist) {
          result.blacklist = blacklist;
          customReason = ResultType.BLACKLISTED;
        }

        if (greylist) {
          result.greylist = greylist;
          customReason = ResultType.GREYLISTED;
        }

        if (smtpResponse.valid) {
          result.validators.smtp = { valid: true };
        } else {
          const reason = customReason || smtpResponse.validators.smtp?.reason;
          result.validators.smtp = { valid: false, reason };
          result.valid = false;
          result.reason = smtpResponse.validators.smtp?.reason;
        }
      }
    } else {
      result.validators.mx = { valid: false, reason: 'MX record not found' };
      result.validators.smtp = { valid: false, reason: 'MX record not found' };
      result.valid = false;
      result.reason = 'MX record not found';
    }
  }
  return result;
}

export default validate;
