'use strict'

import { KafkaJS } from '@confluentinc/kafka-javascript'
const { Kafka } = KafkaJS

/** Kafkajs client */
export default function (clientConfig) {
  return new Kafka({kafkaJS: clientConfig})
}
