'use strict'

import Message from '../message/message.js'

/**
* {
*   topic: 'non-persistent://public/default/my-topic-1',// 'persistent://public/default/my-topic',
*   subscription: 'sub1',
*   subscriptionType: "KeyShared"
* }
*/
export default async function (pulsarClient, consumerConfig) {
  const consumer = await pulsarClient.subscribe(consumerConfig)
  const onMessaggeAction = []
  const loop = async function () {
    while (true) {
      const msg = await consumer.receive()
      for (const action of onMessaggeAction) {
        try {
          await action(Message(msg))
          // consumer.acknowledge(msg)
        } catch (error) {
          console.log(new Date(), '#> Error at pulsar source', error)
          throw error
        }
      }
    }
  }

  return {
    stream: async (cb) => {
      onMessaggeAction.push(cb)
      await loop()
    },
    consumer: () => { return consumer }
  }
}
