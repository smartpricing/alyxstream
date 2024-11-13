'use strict'

import {
  Task,
  MakeStorage,
  StorageKind,
  KafkaSource,
  KafkaClient,
  KafkaCommit,
  KafkaSink
} from '../index.js'

/**
 * 	In order to run this example, you will need a
 * 	Kafka or Redpanda broker on your local machine.
 */

(async () => {
  const topic = 'alyxstream-kafka-example'
  const kafkaClient = KafkaClient({
    brokers: ['localhost:9092']
  })
  let kafkaSource = null
  const kafkaSink = await KafkaSink(kafkaClient)

  /** Consumer **/
  await Task()
    .parallel(5, null, async () => {
      kafkaSource = await KafkaSource(kafkaClient, {
          topics: [{
            topic,
            fromBeginning: true,
            autoCommit: true
          }],
          groupId: 'alyxstream-kafka-example-consumer-3'
        })
    })
    .fromKafka(async () => {
      return kafkaSource
    })
    .keyBy(x => x.partition)
    .tumblingWindowCount(MakeStorage(StorageKind.Memory, null, 'alyxstream-kafka-example-storage'), 10)
    .print('>')
    .close()

  /** Producer **/
  const id = 0
  while (true) {
    await kafkaSink.send({
      topic,
      messages: [
        { key: id.toString(), value: id.toString() }
      ]
    })
    await new Promise(resolve => setTimeout(resolve, 50))
  }
})()
