import { Topics } from "../topics";
import { MailVerificationRequestedEvent } from "./MailVerificationRequestedEvent";

export interface AolVerificationRequestedEvent extends MailVerificationRequestedEvent{
  topic: Topics.AolVerificationRequested;
}