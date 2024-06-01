'use strict'

import cluster from 'node:cluster'
import Message from '../message/message.js'
import Log from '../logger/default.js'

export const parallel = {
  parallel (numberOfProcess, produceFunction = null) {
    const task = this
    const index = task._nextIndex()

    if (cluster.isPrimary) {
      for (let i = 0; i < numberOfProcess; i++) {
        Log('debug', ['Forking process', i])
        cluster.fork()
      }
      cluster.on('exit', (worker, code, signal) => {
        Log('debug', ['Process is dead'])
        cluster.fork()
        Log('debug', ['Forking process'])
      })
    }
    task._setNext(async () => {
      if (cluster.isPrimary && produceFunction !== null) {
        await produceFunction()
      }
      if (!cluster.isPrimary) {
        await task._nextAtIndex(index)(Message(null))
      }
    })
    return task
  }
}
