import { Topics } from "../topics";
import { MailVerificationRequestedEvent } from "./MailVerificationRequestedEvent";

export interface GmailVerificationRequestedEvent extends MailVerificationRequestedEvent {
  topic: Topics.GmailVerificationRequested;
}