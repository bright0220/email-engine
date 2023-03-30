import { SkynetVerificationRequestedEvent, Topics, VerificationFailedEvent } from "../../../broker";
import { ValidationResponse } from "../../../broker/validation-response";
import { config } from "../../../config";
import { logger } from "../../../logger";
import { Blacklist } from "../../../models/blacklist";
import { blacklist } from "../../../services/blacklist";
import { greylist } from "../../../services/greylist";
import { ResultType } from "../../base-validator";
import { custom } from "../../validators";
import { BaseWorker } from "../base-worker";

interface Blacks {
  [key: string]: boolean;
}

interface Greys {
  [key: string]: boolean;
}

export class SkynetWorker extends BaseWorker<SkynetVerificationRequestedEvent> {
  protected validationMethod: string = 'SKYNET';
  protected concurrency: number = config.CONCURRENCY.SKYNET;
  protected maxJobLifeTime: number = config.MAX_JOB_LIFE_TIME.DEFAULT;
  protected blacks: Blacks = {};
  protected greys: Greys = {};
  topic: SkynetVerificationRequestedEvent["topic"] = Topics.SkynetVerificationRequested;

  constructor (protected ip: string, protected connectionOption: { host: string, port: number }) {
    super(ip, connectionOption);
    Blacklist.findByIP(this.ip).then(blacks=> {
      blacks.forEach(black => this.blacks[black.provider] = true);
    })
    greylist.findByIP(this.ip).then(greys => {
      greys.forEach(grey => {
        this.greys[grey.provider] = true
        setTimeout(() => delete this.greys[grey.provider], grey.ttl * 1000);
      });
    })
  }

  onTimeout = async () => {}

  onWork = async (data: SkynetVerificationRequestedEvent["data"]): Promise<ValidationResponse> => {
    const { domain } = data;
    if (this.blacks[domain]) {
      logger.info({ message: `Provider is blacklisted`, ip: this.ip, domain });
      return { ...data, ip: this.ip, valid: false, reason: ResultType.BOUNCED, isSMTP: true };
    }
    if (this.greys[domain]) {
      logger.info({ message: `Provider is greylisted`, ip: this.ip, domain });
      return { ...data, ip: this.ip, valid: false, reason: ResultType.BOUNCED, isSMTP: true }
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
      
      switch (result) {
        case ResultType.BLACKLISTED:
          this.blacks[data.domain] = true;
          await blacklist.add({ ip: this.ip, provider: data.domain, note: output.messages?.join('\n') });
          logger.info({ message: 'blacklisted', ip: this.ip, domain: data.domain });
          break;
        case ResultType.GREYLISTED:
          const expirationCallback = async () => {
            delete this.greys[data.domain];
            logger.info({ message: "greylist expired", ip: this.ip, domain: data.domain })
          };
          this.greys[data.domain] = true;
          await greylist.add({ ip: this.ip, provider: data.domain }, expirationCallback);
          logger.info({ message: "greylisted", ip: this.ip, domain: data.domain })
          break;
      }

      logger.trace({ message: `producing finished result`, ip: this.ip, domain });
      return { ...data, ip: this.ip, valid: result === ResultType.VALID, reason: result, customValidationResult, isSMTP }
    } catch(e) {
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