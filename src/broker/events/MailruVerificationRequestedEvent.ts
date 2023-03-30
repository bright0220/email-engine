import { Topics } from "../topics";
import { MailVerificationRequestedEvent } from "./MailVerificationRequestedEvent";

export interface MailruVerificationRequestedEvent extends MailVerificationRequestedEvent{
  topic: Topics.MailruVerificationRequested;
}