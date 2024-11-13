'use strict'

import KafkaCommit from '../kafka/commit.js'

export const toKafka = {
  toKafka (sink, topic, cb = null, options = null) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      let data = cb == null ? s.payload : cb(s.payload)
      data = Array.isArray(data) === true ? data : [data]
      const obj = {
        topic,
        messages: data,
        ...options
      }
      await sink.send(obj)
      await task._nextAtIndex(index)(s)
    })
    return task
  }
}

export const kafkaCommit = {
  kafkaCommit (kafkaSource, commitParams = null) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const x = s.payload
      let _source = null
      if (typeof kafkaSource === 'function') {
        _source = await kafkaSource()
      } else {
        _source = kafkaSource
      }      
      KafkaCommit(_source, commitParams == null ? x : commitParams)
      await task._nextAtIndex(index)(s)
    })
    return task
  }
}