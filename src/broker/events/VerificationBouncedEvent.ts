import { Topics } from "../topics";
import { MailVerificationRequestedEvent } from "./MailVerificationRequestedEvent";

export interface VerificationBouncedEvent extends MailVerificationRequestedEvent {
  topic: Topics.VerificationBounced;
}