'use strict'

import KafkaJS from 'kafkajs'
import SnappyCodec from 'kafkajs-snappy'
import LZ4 from 'lz4-kafkajs'
import ZstdCodec from '@kafkajs/zstd'

import KafkaCommit from '../kafka/commit.js'

const { CompressionTypes, CompressionCodecs } = KafkaJS

CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec
CompressionCodecs[CompressionTypes.LZ4] = new LZ4().codec
CompressionCodecs[CompressionTypes.ZSTD] = ZstdCodec()

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
      KafkaCommit(kafkaSource, commitParams == null ? x : commitParams)
      await task._nextAtIndex(index)(s)
    })
    return task
  }
}
