import { MailruVerificationRequestedEvent, Topics } from "../../../broker";
import { ValidationResponse } from "../../../broker/validation-response";
import { config } from "../../../config";
import { logger } from "../../../logger";
import { ResultType } from "../../base-validator";
import { mailru } from "../../validators";
import { BaseWorker } from "../base-worker";

export class MailruWorker extends BaseWorker<MailruVerificationRequestedEvent> {
  protected topic: MailruVerificationRequestedEvent["topic"] = Topics.MailruVerificationRequested;
  protected validationMethod: string = 'MAILRU';
  protected concurrency: number = config.CONCURRENCY.HTTP;
  protected maxJobLifeTime: number = config.MAX_JOB_LIFE_TIME.DEFAULT;

  onTimeout = async () => {}

  onWork = async (data: MailruVerificationRequestedEvent["data"]): Promise<ValidationResponse> => {
    try {
      const result = await mailru.validate(data.email);
      return {
        ...data,
        ip: this.ip,
        valid: result === ResultType.VALID,
        reason: result,
        isSMTP: false,
      };
    } catch (e) {
      logger.error(e);
      return {
        ...data,
        ip: this.ip,
        valid: false,
        reason: ResultType.CRASH,
        isSMTP: false,
      };
    }
  };
}