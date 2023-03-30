import { OutlookVerificationRequestedEvent, Topics, VerificationFailedEvent } from "../../../broker";
import { ValidationResponse } from "../../../broker/validation-response";
import { config } from "../../../config";
import { logger } from "../../../logger";
import { ResultType } from "../../base-validator";
import { outlook } from "../../validators";
import { BaseWorker } from "../base-worker";

export class OutlookWorker extends BaseWorker<OutlookVerificationRequestedEvent> {
  topic: OutlookVerificationRequestedEvent["topic"] = Topics.OutlookVerificationRequested;
  protected concurrency: number = config.CONCURRENCY.OUTLOOK;
  protected validationMethod: string = 'OUTLOOK';
  protected maxJobLifeTime: number = config.MAX_JOB_LIFE_TIME.OUTLOOK;

  onTimeout = async () => {
    await outlook.renewTorSession();
  }

  onWork = async (data: OutlookVerificationRequestedEvent["data"]): Promise<ValidationResponse> => {

    try {
      const result = await outlook.validate(data.email);

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