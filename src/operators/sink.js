'use strict'

export const toKafka = {
    toKafka (sink, topic, cb = null) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            let data = cb == null ? s : cb(s)
            data = Array.isArray(data) == true ? data : [data]
            sink.send({
                topic: topic,
                messages: data
            })
            await task._nextAtIndex(index)(s)
        })
        return task
    }
}