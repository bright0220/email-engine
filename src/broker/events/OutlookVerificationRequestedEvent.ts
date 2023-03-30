import { Topics } from "../topics";
import { MailVerificationRequestedEvent } from "./MailVerificationRequestedEvent";

export interface OutlookVerificationRequestedEvent extends MailVerificationRequestedEvent {
  topic: Topics.OutlookVerificationRequested;
}