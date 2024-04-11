'use strict'

import Message from '../message/message.js'

export const withStorage = {

  withStorage (storageInstance) {
    const task = this
    const index = task._nextIndex()
    task._storage = storageInstance
    task._setNext(async (s) => {
      await task._nextAtIndex(index)(s)
    })
    return task
  },

  toStorage (keyFunction, valueFunction = null, ttl = null) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      const res = s
      const valueToSave = valueFunction == null ? res : valueFunction(res)
      await storage.set(keyFunction(res), valueToSave, ttl)
      await task._nextAtIndex(index)(s)
    })
    return task
  },

  toStorageList (keyFunction, valueFunction = null, ttl = null) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      const res = s
      const valueToSave = valueFunction == null ? res : valueFunction(res)
      const key = keyFunction(res)
      await storage.push(key, valueToSave, ttl)
      await task._nextAtIndex(index)(s)
    })
    return task
  },

  fromStorage (keyFunction) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      const returnArray = s.payload
      for (const key of keyFunction(s)) {
        const storedValue = await storage.get(key)
        returnArray.push(storedValue)
      }
      await task._nextAtIndex(index)(s)
    })
    return task
  },

  fromStorageList (keyFunction, valueFunction) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      const returnArray = valueFunction(s)
      for (const key of keyFunction(s)) {
        const storedValue = await storage.getList(key)
        for (const r of storedValue) {
          returnArray.push(r)
        }
      }
      const flat = returnArray.flat()
      await task._nextAtIndex(index)(Message(flat))
    })
    return task
  },

  fromStorageToGlobalState (keyFunction) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      const map = {}
      for (const key of keyFunction(s)) {
        const storedValue = await storage.get(key)
        map[key] = storedValue
      }
      s.globalState = map
      await task._nextAtIndex(index)(s)
    })
    return task
  },

  disconnectStorage () {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      await storage.disconnect()
      await task._nextAtIndex(index)(s)
    })
    return task
  },

  flushStorage (keyFunction) {
    const task = this
    const index = task._nextIndex()
    const storage = task._storage
    task._setNext(async (s) => {
      for (const key of keyFunction(s)) {
        await storage.flush(key)
      }
      await task._nextAtIndex(index)(s)
    })
    return task
  },

  storage () {
    const task = this
    return task._storage
  }

}
