import { Topics } from "../topics";
import { MailVerificationRequestedEvent } from "./MailVerificationRequestedEvent";

export interface SkynetVerificationRequestedEvent extends MailVerificationRequestedEvent {
  topic: Topics.SkynetVerificationRequested;
}