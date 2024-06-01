'use strict'

import WebSocket from 'ws'
import Message from '../message/message.js'

/**
*   'non-persistent://public/default/my-topic-1'
*/
export default async function (sources, options) {
  const onMessaggeAction = []
  const s = typeof sources === 'string' ? [sources] : sources
  // const asyncSend = (_ws, mex) => {
  //   return new Promise((resolve, reject) => {
  //     _ws.send(mex, z => {
  //               resolve()
  //     })
  //   })
  // }

  const connect = (t) => {
    let ws = null
    ws = new WebSocket(t, options)
    ws.on('message', async function (message) {
      try {
        const p = JSON.parse(message)
        p.payload = Buffer.from(p.payload, 'base64').toString()
        for (const action of onMessaggeAction) {
          await action(Message(p))
        }
        const ackMsg = { messageId: p.messageId }
        // await asyncSend(ws, JSON.stringify(ackMsg))
        // asyncSend(ws, JSON.stringify(ackMsg))
        ws.send(JSON.stringify(ackMsg))
      } catch (error) {
        console.log(new Date(), '#> Error at pulsar source', error)
        throw error
      }
    })
    ws.on('open', () => {
      console.log(process.pid, 'OPEN WS', t)
    })
    ws.on('close', (x) => {
      console.log(process.pid, 'CLOSE WS', t)
      ws.terminate()
      connect(t)
    })
    ws.on('error', (err) => {
      console.log(process.pid, 'ERROR WS', t, err)
      if (err.code === 'ECONNREFUSED') {
        ws.removeAllListeners()
      }
      ws.terminate()
      connect(t)
    })
  }

  for (const t of s) {
    connect(t)
  }

  return {
    stream: async (cb) => {
      onMessaggeAction.push(cb)
    },
    consumer: () => { }
  }
}
