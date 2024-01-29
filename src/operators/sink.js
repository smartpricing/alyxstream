'use strict'

import { CompressionTypes } from 'kafkajs'
import KafkaCommit from '../kafka/commit.js'

export const toKafka = {
    toKafka (sink, topic, cb = null, options = null) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            let data = cb == null ? s.payload : cb(s.payload)
            data = Array.isArray(data) == true ? data : [data]
            let obj = {
                topic: topic,
                messages: data
            }
            if (options !== null && options.compressionType !== null && options.compressionType !== undefined) {
                obj.compression = CompressionTypes[options.compressionType] // CompressionTypes.GZIP
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