import { Topics } from "../topics";

export interface Event {
  topic: Topics;
  data: any;
}