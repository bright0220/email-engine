import { ResultType } from "../../worker/base-validator";
import { Topics } from "../topics";

export interface VerificationFailedEvent {
  topic: Topics.VerificationFailed;
  data: {
    id: string;
    email: string;
    domain: string;
    reason: ResultType;
    ip: string;
    customValidationResult?: {
      valid: boolean;
      regex?: {
        valid: boolean;
        reason?: string;
      };
      typo?: {
        valid: boolean;
        reason?: string;
      };
      disposable?: {
        valid: boolean;
        reason?: string;
      };
      mx?: {
        valid: boolean;
        reason?: string;
      };
      smtp?: {
        valid: boolean;
        reason?: string;
        messages?: string[];
      };
    }
  }
}