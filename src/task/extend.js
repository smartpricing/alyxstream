'use strict'

import Message from '../message/message.js'
export const extensions = {}

export function set (name, extension) {
  const extensionFn = function (...args) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      if (element === undefined || element == null) {
        element = Message()
      }
      const res = await extension(element.payload, ...args)
      await task._nextAtIndex(index)(Message(res, element.metadata, element.globalState))
    })
    return task
  }
  extensions[name] = extensionFn
}

export function setRaw (name, extension) {
  const extensionFn = function (...args) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      if (element === undefined || element == null) {
        element = Message()
      }
      const res = await extension(element, ...args)
      const mex = Message(res.payload, res.metadata, res.globalState)
      await task._nextAtIndex(index)(mex)
    })
    return task
  }
  extensions[name] = extensionFn
}
