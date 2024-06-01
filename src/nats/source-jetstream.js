'use strict'

import { AckPolicy, JSONCodec, DeliverPolicy } from 'nats'
import Message from '../message/message.js'
/**
* sources = [{
*  stream: string,
*  durable_name: string,
*  ack_policy: string,
*  filter_subject: string
* }]
*
*/
export default async function (natsClients, sources) {
  const onMessaggeAction = []
  const nc = natsClients
  const sc = JSONCodec()
  const jsm = await nc.jetstreamManager()
  const run = async function () {
    for (const source of sources) {
      const r = async function () {
        const stream = source.stream
        const js = nc.jetstream()
        if (source.ack_policy !== undefined) {
          source.ack_policy = AckPolicy[source.ack_policy]
        }
        if (source.deliver_policy !== undefined) {
          source.deliver_policy = DeliverPolicy[source.deliver_policy]
        }
        try {
          await jsm.consumers.add(stream, source)
        } catch (error) {
          console.log(new Date(), '#> Error, resetting consumer', error)
          await jsm.consumers.delete(stream, source.durable_name)
          await jsm.consumers.add(stream, source)
        }
        const c = await js.consumers.get(stream, source.durable_name)

        while (true) {
          const messages = await c.consume()
          try {
            for await (const m of messages) {
              const payload = sc.decode(m.data)
              for (const action of onMessaggeAction) {
                try {
                  const p = {
                    data: payload.payload,
                    m
                  }
                  const mex = Message(p)
                  await action(mex)
                } catch (error) {
                  console.log(new Date(), '#> Error at nats jetstream source', error)
                }
              }
            }
          } catch (err) {
            console.log(new Date(), '#> Error at nats jetstream source', err)
          }
        }
      }
      r()
    }
  }
  return {
    stream: async (cb) => {
      onMessaggeAction.push(cb)
      await run()
    },
    consumer: () => { }
  }
}
