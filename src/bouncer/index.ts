import { Topics } from "../broker";
// import { kafkaWrapper } from "../broker/kafka-wrapper";
import { config } from "../config";
import { logger } from "../logger";

const clientId = 'bouncer';
const groupId = 'worker';

async function main(): Promise<void> {
  // await kafkaWrapper.connect({ clientId, kafkaHost: config.KAFKA_HOST });
  // await kafkaWrapper.createTopics(Object.values(Topics));

  // const consumerGroup = new BouncerConsumerGroup(clientId, groupId);
  // await consumerGroup.listen();
  // logger.info({ message: `Worker bouncer started....` });
}

main();