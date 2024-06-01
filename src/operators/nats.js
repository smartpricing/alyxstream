'use strict'

import { JSONCodec } from 'nats'

export const fromNats = {
  fromNats (source) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async () => {
      await source.stream(async (message) => {
        await task._nextAtIndex(index)(message)
      })
    })
    return task
  }
}

export const toNats = {
  toNats (sink, topic, datacb) {
    const task = this
    const index = task._nextIndex()
    const sc = JSONCodec()
    const nc = sink
    task._setNext(async (s) => {
      await nc.publish(topic, sc.encode(s))
      await task._nextAtIndex(index)(s)
    })
    return task
  }
}
