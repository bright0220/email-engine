import { Topics } from "../topics";

export interface MailVerificationRequestedEvent {
  topic: Topics;
  data: {
    id: string;
    email: string;
    domain: string;
  }
}