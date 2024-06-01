'use strict'

import Message from '../message/message.js'

export const localStorage = {
  withLocalKVStorage () {
    const task = this
    task._localStorage = {}
    return this
  },
  setLocalKV (k, func) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      task._localStorage[k] = func(element.payload)
      await task._nextAtIndex(index)(element)
    })
    return task
  },
  setLocalKVRaw (k, func) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      task._localStorage[k] = func(element)
      await task._nextAtIndex(index)(element)
    })
    return task
  },
  getLocalKV (k) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      await task._nextAtIndex(index)(Message(k == null ? task._localStorage : task._localStorage[k], element.metadata, element.globalState))
    })
    return task
  },
  mergeLocalKV (k) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      element.payload[k] = task._localStorage[k]
      await task._nextAtIndex(index)(Message(element.payload, element.metadata, element.globalState))
    })
    return task
  },
  flushLocalKV (k) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      delete task._localStorage[k]
      await task._nextAtIndex(index)(element)
    })
    return task
  }
}
