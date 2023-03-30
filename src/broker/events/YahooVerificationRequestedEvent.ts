import { Topics } from "../topics";
import { MailVerificationRequestedEvent } from "./MailVerificationRequestedEvent";

export interface YahooVerificationRequestedEvent extends MailVerificationRequestedEvent {
  topic: Topics.YahooVerificationRequested;
}