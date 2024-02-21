'use strict'

import Message from '../message/message.js'

export const fromPulsar = {
    fromPulsar (source) {
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

export const toPulsar = {
    toPulsar (sink, keycb, datacb) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            const key = keycb == null ? null : keycb(s.payload)
            const data = datacb == null ? s.payload : datacb(s.payload)
            let mex = {
              data: Buffer.from(JSON.stringify(data))
            }
            if (key == null) {
                mex.partitionKey = key.toString()
            }
            sink.send(mex)              
            await task._nextAtIndex(index)(s)
        })
        return task
    }
}

export const flushPulsar = {
    flushPulsar (sink) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            await sink.flush()          
            await task._nextAtIndex(index)(s)
        })
        return task
    }
}

export const ackPulsar = {
    ackPulsar (source) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (x) => {
            const c = source.consumer()
            await c.acknowledge(x.payload)          
            await task._nextAtIndex(index)(x)
        })
        return task
    }
}

export const parsePulsar = {
    parsePulsar (parseWith = null) {
        const task = this
        const index = task._nextIndex()
        const payloadParser = typeof parseWith == 'function' ? parseWith.parseWith : (v) => { return JSON.parse(v) }
        task._setNext(async (x) => {
            const payload = x.payload.getData().toString()
            await task._nextAtIndex(index)(Message(payloadParser(payload)))
        })
        return task
    }
}