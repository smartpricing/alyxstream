'use strict'

import Message from '../message/message.js'

export const collect = {
  collect (idFunction, keyFunction, valueFunction, waitUntil, emitFunction, ttl = null) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage

    const singlePidMap = {}

    task._setNext(async (s) => {
      const res = s
      const id = idFunction(res)
      const key = keyFunction(res)
      const pid = id + '.' + key
      // console.log(process.pid, '#> init check', id, key)
      const valueToSave = valueFunction == null ? res : valueFunction(res)
      await storage.pushId(id, key, valueToSave, ttl)
      if (singlePidMap[pid] !== undefined) {
        return
      }
      singlePidMap[pid] = pid
      const check = async function () {
        while (true) {
          // console.log(process.pid, '#> checking', id, key)
          const returnArray = await storage.getListId(id, key)

          const flat = returnArray.flat().map(y => y.payload).flat()
          const toEmit = await emitFunction(returnArray, flat)
          const toBreak = await waitUntil(returnArray, flat)
          // console.log(process.pid, '#> checked', id, key, toEmit, toBreak)
          if (toEmit === true) {
            await task._nextAtIndex(index)(Message(flat))
            setTimeout(async () => {
              delete singlePidMap[pid]
              await storage.flushStorageId(id)
            }, 10000)
          }
          if (toBreak === true) {
            break
          }
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      await check()
    })
    return task
  }
}
