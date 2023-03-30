import { GmailVerificationRequestedEvent, Topics } from "../../../broker";
import { ValidationResponse } from "../../../broker/validation-response";
import { config } from "../../../config";
import { logger } from "../../../logger";
import { ResultType } from "../../base-validator";
import { gmail } from "../../validators";
import { BaseWorker } from "../base-worker";

export class GmailWorker extends BaseWorker<GmailVerificationRequestedEvent> {
  topic: GmailVerificationRequestedEvent["topic"] = Topics.GmailVerificationRequested;
  protected validationMethod: string = 'GMAIL';
  protected concurrency: number = config.CONCURRENCY.GMAIL;
  protected maxJobLifeTime: number = config.MAX_JOB_LIFE_TIME.GMAIL;

  onTimeout = async () => {}

  onWork = async (data: GmailVerificationRequestedEvent["data"]): Promise<ValidationResponse> => {
    try {
      const result = await gmail.validate(data.email);

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