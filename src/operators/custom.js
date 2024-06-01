'use strict'

import Message from '../message/message.js'

export const fn = {
  fn (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const res = await cb(s.payload)
      await task._nextAtIndex(index)(Message(res, s.metadata, s.globalState))
    })
    return task
  }
}

export const fnRaw = {
  fnRaw (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const res = await cb(s)
      await task._nextAtIndex(index)(Message(res, s.metadata, s.globalState))
    })
    return task
  }
}

export const customFunction = {
  customFunction (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const res = cb(s.payload)
      await task._nextAtIndex(index)(Message(res, s.metadata, s.globalState))
    })
    return task
  }
}

export const customAsyncFunction = {
  customAsyncFunction (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const res = await cb(s.payload)
      await task._nextAtIndex(index)(Message(res, s.metadata, s.globalState))
    })
    return task
  }
}

export const customFunctionRaw = {
  customFunctionRaw (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const res = cb(s)
      await task._nextAtIndex(index)(Message(res, s.metadata, s.globalState))
    })
    return task
  }
}

export const customAsyncFunctionRaw = {
  customAsyncFunctionRaw (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const res = await cb(s)
      await task._nextAtIndex(index)(Message(res, s.metadata, s.globalState))
    })
    return task
  }
}

export const joinByKeyWithParallelism = {
  joinByKeyWithParallelism (storage, keyFunction, parallelism) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (mex) => {
      const commonKey = keyFunction(mex)

      let payloadToSave = null
      const storedValue = await storage.get(commonKey)
      if (storedValue === null || storedValue === undefined) {
        payloadToSave = [mex]
      } else {
        storedValue.push(mex)
        payloadToSave = storedValue
      }

      if (payloadToSave.length === parallelism) {
        const joinedData = {
          payload: [],
          metadata: []
        }
        payloadToSave.forEach(p => joinedData.payload.push(p.payload))
        payloadToSave.forEach(p => joinedData.metadata.push(p.metadata))
        joinedData.payload = joinedData.payload.flat()

        await task._nextAtIndex(index)(joinedData)
        await storage.flush(commonKey)
      } else {
        await storage.set(commonKey, payloadToSave)
        return null
      }
    })
    return task
  }
}
