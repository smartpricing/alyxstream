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
 *
 *  Running this example with the env ALYXSTREAM_LOG_LEVEL=debug
 * 	will show to you the commit log message.
 */

(async () => {
  const topic = 'alyxstream-kafka-example-kafka-commit'
  const kafkaClient = KafkaClient({
    brokers: ['localhost:9092']
  })
  const kafkaSource = await KafkaSource(kafkaClient, {
    topics: [{
      topic,
      fromBeginning: true,
      autoCommit: false
    }],
    groupId: 'alyxstream-kafka-example-kafka-commit-consumer'
  })
  const kafkaSink = await KafkaSink(kafkaClient)

  /** Consumer **/
  await Task()
    .withLocalKVStorage()
    .fromKafka(kafkaSource)
    .setLocalKV('kafka-mex', x => x)
    .keyBy(x => x.partition)
    .tumblingWindowCount(MakeStorage(StorageKind.Memory, null, 'alyxstream-kafka-example-storage'), 10)
    .print('>')
    .getLocalKV('kafka-mex')
    .kafkaCommit(kafkaSource)
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
    await new Promise(resolve => setTimeout(resolve, 500))
  }
})()
