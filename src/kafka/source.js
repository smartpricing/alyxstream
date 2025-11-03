'use strict'

import Message from '../message/message.js'

export default async function (kafkaClient, consumerConfig) {
  const topics = consumerConfig.topics

  // Validate deprecated per-topic options
  for (const topic of topics) {
    if (topic.fromBeginning !== undefined || topic.autoCommit !== undefined) {
      throw new Error('fromBeginning and autoCommit must be set at consumer creation, not per topic')
    }
    if (topic.autoHeartbeat !== undefined) {
      throw new Error('autoHeartbeat is no longer supported. Heartbeat is automatically managed')
    }
  }

  const kafkaJSConfig = {
    groupId: consumerConfig.groupId,
    fromBeginning: consumerConfig.fromBeginning,
    autoCommit: consumerConfig.autoCommit,
    autoCommitInterval: consumerConfig.autoCommitInterval,
    heartbeatInterval: consumerConfig.heartbeatInterval,
    rebalanceTimeout: consumerConfig.rebalanceTimeout,
    maxBytesPerPartition: consumerConfig.maxBytesPerPartition,
    minBytes: consumerConfig.minBytes,
    maxWaitTimeInMs: consumerConfig.maxWaitTimeInMs,
    maxBytes: consumerConfig.maxBytes,
    metadataMaxAge: consumerConfig.metadataMaxAge,
    allowAutoTopicCreation: consumerConfig.allowAutoTopicCreation
  }

  Object.keys(kafkaJSConfig).forEach(key => {
    if (kafkaJSConfig[key] === undefined) {
      delete kafkaJSConfig[key]
    }
  })

  const consumer = kafkaClient.consumer({ kafkaJS: kafkaJSConfig })
  await consumer.connect()

  for (const topic of topics) {
    await consumer.subscribe({ topic: topic.topic })
  }

  const onMessaggeAction = []
  const payloadParsers = new Map()
  for (const t of topics) {
    const payloadParser = typeof t.parseWith === 'function' ? t.parseWith : (v) => { return JSON.parse(v) }
    payloadParsers.set(t.topic, payloadParser)
  }

  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const payloadParser = payloadParsers.get(topic) || ((v) => { return JSON.parse(v) })
      for (const action of onMessaggeAction) {
        try {
          await action(Message({
            topic,
            offset: message.offset,
            partition,
            headers: message.headers,
            key: message.key.toString(),
            value: payloadParser(message.value)
          }))
        } catch (error) {
          console.log(new Date(), '#> Error at kafka source', error)
        }
      }
    }
  })

  return {
    stream: async (cb) => {
      onMessaggeAction.push(cb)
    },
    consumer: () => { return consumer },
    disconnect: async () => {
      await consumer.disconnect()
    }
  }
}
