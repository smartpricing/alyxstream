'use strict'

import Message from '../message/message.js'

function randomInteger (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const lock = {
  lock (storage, lockKeyFn, retryTimeMs = null) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      if (element === undefined || element == null) {
        element = Message()
      }
      const lockKey = await lockKeyFn(element.payload)
      while (true) {
        const res = await storage.lock(lockKey)
        if (res !== null) {
          await task._nextAtIndex(index)(element)
          break
        } else if (retryTimeMs === null) {
          break
        } else {
          await new Promise(resolve => setTimeout(resolve, retryTimeMs + randomInteger(0, 50)))
        }
      }
    })
    return task
  }
}

export const release = {
  release (storage, lockKeyFn) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      if (element === undefined || element == null) {
        element = Message()
      }
      const lockKey = await lockKeyFn(element.payload)
      const res = await storage.release(lockKey)
      if (res !== null) {
        await task._nextAtIndex(index)(element)
      }
    })
    return task
  }
}

export const counter = {
  counter (storage, lockKeyFn, incrFn, retryTimeMs = null) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      if (element === undefined || element == null) {
        element = Message()
      }
      const lockKey = await lockKeyFn(element.payload)
      const valueKey = lockKey + '-value'
      while (true) {
        const res = await storage.lock(lockKey)
        if (res !== null) {
          const resVal = await storage.getCounter(valueKey)
          const incr = await incrFn(element.payload, resVal === '' ? 0 : resVal)
          await storage.setCounter(valueKey, incr)
          await storage.release(lockKey)
          await task._nextAtIndex(index)(Message(incr))
          break
        } else if (retryTimeMs === null) {
          break
        } else {
          await new Promise(resolve => setTimeout(resolve, retryTimeMs + randomInteger(0, 50)))
        }
      }
    })
    return task
  }
}
