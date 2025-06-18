'use strict'

import Message from '../message/message.js'
import Log from '../logger/default.js'

const isRebalancing = e =>
  e.type === 'REBALANCE_IN_PROGRESS' ||
  e.type === 'NOT_COORDINATOR_FOR_GROUP' ||
  e.type === 'ILLEGAL_GENERATION'

export default async function (kafkaClient, consumerConfig) {
  const topics = consumerConfig.topics

  const consumer = await kafkaClient.consumer({ groupId: consumerConfig.groupId, sessionTimeout: consumerConfig.sessionTimeout })
  for (const topic of topics) {
    await consumer.subscribe({ topic: topic.topic, fromBeginning: topic.fromBeginning })
  }
  await consumer.connect()

  const onMessaggeAction = []
  for (const t of topics) {
    const autoHeartbeat = t.autoHeartbeat === undefined ? null : parseInt(t.autoHeartbeat)
    const payloadParser = typeof t.parseWith === 'function' ? t.parseWith : (v) => { return JSON.parse(v) }
    consumer.run({
      autoCommit: t.autoCommit !== false,
      eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
        let heartbeatInterval = null
        if (autoHeartbeat !== null && heartbeatInterval == null) {
          heartbeatInterval = setInterval(async () => {
            try {
              await heartbeat()
            } catch (e) {
              if (isRebalancing(e)) {
                return Log('warning', ['Kafka consumer heartbeat failed due to rebalancing. This is expected and will resolve automatically.'])
              }

              Log('error', ['Kafka consumer heartbeat failed with an unexpected error.', e])
            }
          }, autoHeartbeat)
        }
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
            if (heartbeatInterval !== null) {
              clearInterval(heartbeatInterval)
            }
          }
        }
        if (heartbeatInterval !== null) {
          clearInterval(heartbeatInterval)
        }
      }
    })
  }
  return {
    stream: async (cb) => {
      onMessaggeAction.push(cb)
    },
    consumer: () => { return consumer }
  }
}
