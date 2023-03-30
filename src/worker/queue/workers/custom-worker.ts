import { CustomVerificationRequestedEvent, Topics, VerificationFailedEvent } from "../../../broker";
import { ValidationResponse } from "../../../broker/validation-response";
import { config } from "../../../config";
import { logger } from "../../../logger";
import { greylist as blacklist } from "../../../services/greylist";
import { ResultType } from "../../base-validator";
import { ConcurrencyManager } from "../../concurrency-manager";
import { custom } from "../../validators";
import { BaseWorker } from "../base-worker";

const concurrencyManager = new ConcurrencyManager()

export class CustomWorker extends BaseWorker<CustomVerificationRequestedEvent> {
  protected validationMethod: string = 'CUSTOM';
  protected concurrency: number = config.CONCURRENCY.SMTP * 10 * 8;
  protected maxJobLifeTime: number = config.MAX_JOB_LIFE_TIME.DEFAULT;
  topic: CustomVerificationRequestedEvent["topic"] = Topics.CustomVerificationRequested;

  constructor(protected ip: string, protected connectionOption: { host: string, port: number }) {
    super(ip, connectionOption);
  }

  onTimeout = async () => {}

  onWork = async (data: CustomVerificationRequestedEvent["data"]): Promise<ValidationResponse> => {
    const { domain } = data;
    const blacklisted = await blacklist.contains({ ip: this.ip, provider: domain });

    if (blacklisted) {
      logger.trace({
        message: `bounce back because blacklisted`,
        ip: this.ip,
        domain
      });
      return { ...data, ip: this.ip, valid: false, reason: ResultType.BOUNCED, isSMTP: true };
    }

    try {
      await concurrencyManager.enqueue(domain, data.id)
    } catch (e) {
      logger.trace({
        message: `bounce back because concurrency limit reached`,
        ip: this.ip,
        domain
      });
      return { ...data, ip: this.ip, valid: false, reason: ResultType.BOUNCED, isSMTP: true };
    }


    try {
      const { result, output, isSMTP } = await custom.validateCustom(data.email);
      const { validators, valid, messages } = output;
      const customValidationResult: VerificationFailedEvent['data']['customValidationResult'] = {
        ...validators,
        valid,
        smtp: {
          valid: validators.smtp?.valid || false,
          reason: validators.smtp?.reason,
          messages,
        }
      };

      concurrencyManager.dequeue(domain, data.id)

      if (result === ResultType.VALID || result === ResultType.INVALID || result === ResultType.CATCH_ALL) {
        logger.trace({ message: `producing finished result`, ip: this.ip, domain });
        return { ...data, ip: this.ip, valid: result === ResultType.VALID, reason: result, customValidationResult, isSMTP }
      }

      if (result === ResultType.BLACKLISTED) {
        await blacklist.add({ ip: this.ip, provider: domain });
      }

      return {
        ...data,
        ip: this.ip,
        valid: false,
        reason: result,
        customValidationResult,
        isSMTP
      };
    } catch (e) {

      concurrencyManager.dequeue(domain, data.id)

      return {
        ...data,
        ip: this.ip,
        valid: false,
        reason: ResultType.CRASH,
        isSMTP: true,
      }
    }
  };
}