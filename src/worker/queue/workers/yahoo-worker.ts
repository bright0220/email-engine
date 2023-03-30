import { Topics, YahooVerificationRequestedEvent } from "../../../broker";
import { ValidationResponse } from "../../../broker/validation-response";
import { config } from "../../../config";
import { logger } from "../../../logger";
import { ResultType } from "../../base-validator";
import { yahoo } from "../../validators";
import { BaseWorker } from "../base-worker";

export class YahooWorker extends BaseWorker<YahooVerificationRequestedEvent> {
  topic: YahooVerificationRequestedEvent["topic"] = Topics.YahooVerificationRequested;
  protected validationMethod: string = 'YAHOO';
  protected concurrency: number = config.CONCURRENCY.HTTP;
  protected maxJobLifeTime: number = config.MAX_JOB_LIFE_TIME.DEFAULT;

  onTimeout = async () => {}

  onWork = async (data: YahooVerificationRequestedEvent["data"]): Promise<ValidationResponse> => {
    try {
      const result = await yahoo.validate(data.email);
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