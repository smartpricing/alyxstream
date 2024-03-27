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
      const key = keycb === null ? null : keycb(s.payload)
      const data = datacb === null ? s.payload : datacb(s.payload)
      const mex = {
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

export const toPulsarWs = {
  toPulsarWs (sink, keycb, datacb) {
    const task = this
    const index = task._nextIndex()
    let open = false
    sink.on('open', x => {
      open = true
    })
    sink.on('close', x => {
      open = false
    })
    const asyncSend = (ws, mex) => {
      return new Promise((resolve, reject) => {
        ws.send(mex, z => {
          resolve()
        })
      })
    }
    task._setNext(async (s) => {
      if (open === false) {
        while (!open) {
          await new Promise(resolve => setTimeout(resolve, 100))
          if (open === false) {
            open = true
          }
        }
      }
      const _payload = Buffer.from(JSON.stringify(datacb === undefined ? s.payload : datacb(s.payload))).toString('base64')
      const mex = { payload: _payload }
      await asyncSend(sink, JSON.stringify(mex))

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
    const payloadParser = typeof parseWith === 'function' ? parseWith : (v) => { return JSON.parse(v) }
    task._setNext(async (x) => {
      const payload = x.payload.getData().toString()
      await task._nextAtIndex(index)(Message(payloadParser(payload)))
    })
    return task
  }
}
