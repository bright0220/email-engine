import { AolVerificationRequestedEvent, Topics } from "../../../broker";
import { ValidationResponse } from "../../../broker/validation-response";
import { config } from "../../../config";
import { logger } from "../../../logger";
import { ResultType } from "../../base-validator";
import { aol } from "../../validators";
import { BaseWorker } from "../base-worker";

export class AolWorker extends BaseWorker<AolVerificationRequestedEvent> {
  topic: AolVerificationRequestedEvent["topic"] = Topics.AolVerificationRequested;
  protected validationMethod: string = 'AOL';
  protected concurrency: number = config.CONCURRENCY.HTTP;
  protected maxJobLifeTime: number = config.MAX_JOB_LIFE_TIME.DEFAULT;

  onTimeout = async () => {}

  onWork = async (data: AolVerificationRequestedEvent["data"]): Promise<ValidationResponse> => {
    try {
      const result = await aol.validate(data.email);

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