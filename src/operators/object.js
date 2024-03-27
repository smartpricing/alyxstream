'use strict'

import Message from '../message/message.js'

export const sumMap = {
  sumMap () {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const newObject = {}
      Object.keys(s.payload).forEach((k) => {
        newObject[k] = s.payload[k].length
      })
      await task._nextAtIndex(index)(Message(newObject, s.metadata, s.globalState))
    })
    return task
  }
}

export const objectGroupBy = {
  objectGroupBy (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const newObject = {}
      const groupBy = (x, f) => {
        return x.reduce((a, b, i) => ((a[f(b, i, x)] ||= []).push(b), a), {}) // eslint-disable-line
      }
      Object.keys(s.payload).forEach(k => {
        newObject[k] = groupBy(s.payload[k], cb)
      })
      await task._nextAtIndex(index)(Message(newObject, s.metadata, s.globalState))
    })
    return task
  }
}

export const aggregate = {
  aggregate (storage, name, keyFunction) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (s) => {
      const valueToSave = s.payload
      const key = keyFunction(s.payload)
      let currentMap = await storage.get(name)
      if (currentMap == null) {
        currentMap = {}
      }
      if (currentMap[key] === undefined) {
        currentMap[key] = []
      }
      currentMap[key].push(valueToSave)
      await storage.set(name, currentMap)

      await task._nextAtIndex(index)(Message(currentMap, s.metadata, s.globalState))
    })
    return task
  }
}
