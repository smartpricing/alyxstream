'use strict'

import Message from '../message/message.js'

export const collect = {
  collect (keyFunction, valueFunction, emitFunction, ttl = null) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      const res = s
      const returnArray = []
      const key = keyFunction(res)
      const valueToSave = valueFunction == null ? res : valueFunction(res)
      await storage.push(key, valueToSave, ttl)

      const storedValue = await storage.getList(key)
      for (const r of storedValue) {
        returnArray.push(r)
      }

      const flat = returnArray.flat().map(y => y.payload).flat()
      const toEmit = await emitFunction(flat)
      if (toEmit === true) {
        await task._nextAtIndex(index)(Message(flat))
        await storage.flushStorage(keyFunction)
      }
    })
    return task
  }
}
