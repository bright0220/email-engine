import { Topics } from "../topics";
import { MailVerificationRequestedEvent } from "./MailVerificationRequestedEvent";

export interface CustomVerificationRequestedEvent extends MailVerificationRequestedEvent {
  topic: Topics.CustomVerificationRequested;
}