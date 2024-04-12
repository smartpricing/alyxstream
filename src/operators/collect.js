'use strict'

import Message from '../message/message.js'

export const collect = {
  collect (idFunction, keyFunction, valueFunction, waitUntil, emitFunction, ttl = null) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      const res = s
      const id = idFunction(res)
      const key = keyFunction(res)
      const valueToSave = valueFunction == null ? res : valueFunction(res)
      await storage.pushId(id, key, valueToSave, ttl)
      const check = async function () {
        while (true) {
          const returnArray = await storage.getListId(id, key)
          
          const flat = returnArray.flat().map(y => y.payload).flat()
          const toEmit = await emitFunction(flat)
          const toBreak = await waitUntil(flat)
          if (toEmit === true) {
            await task._nextAtIndex(index)(Message(flat))
            setTimeout(async () => {
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
