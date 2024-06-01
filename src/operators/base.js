'use strict'

import Readline from 'readline'
import Message from '../message/message.js'

export const withMetadata = {
  withMetadata () {
    const task = this
    task._metadata = {
      id: null
    }
    return this
  },
  setMetadata (id) {
    this._metadata.id = id
    return this
  },
  getMetadata () {
    return this._metadata
  }
}

export const withDefaultKey = {
  withDefaultKey () {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      element.metadata.key = 'default'
      await task._nextAtIndex(index)(element)
    })
    return task
  }
}

export const keyBy = {
  keyBy (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      element.metadata.key = cb(element.payload)
      await task._nextAtIndex(index)(element)
    })
    return task
  }
}

export const filter = {
  filter (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      if (cb(element.payload) === true) {
        await task._nextAtIndex(index)(element)
      }
    })
    return task
  }
}

export const sum = {
  sum () {
    const task = this
    let counter = 0
    const index = task._nextIndex()
    task._setNext(async (element) => {
      counter += element.payload
      await task._nextAtIndex(index)(Message(counter, element.metadata, element.globalState))
    })
    return task
  }
}

export const withEventTime = {
  withEventTime (cb) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      element.metadata.eventTime = cb(element.payload)
      await task._nextAtIndex(index)(element)
    })
    return task
  }
}

export const tokenize = {
  tokenize (separator = ' ') {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      const splitted = element.payload.split(separator)
      await task._nextAtIndex(index)(Message(splitted, element.metadata, element.globalState))
    })
    return task
  }
}

export const print = {
  print (str = null) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      if (str == null) {
        console.log(element)
      } else {
        console.log(str, element)
      }
      await task._nextAtIndex(index)(element)
    })
    return task
  }
}

export const branch = {
  branch (arrayOfFunctions) {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (element) => {
      const results = []
      for (const func of arrayOfFunctions) {
        const taskRes = await func(element.payload)
        results.push(taskRes.finalize())
      }
      await task._nextAtIndex(index)(Message(results, element.metadata, element.globalState))
    })
    return task
  }
}

export const readline = {
  readline () {
    const task = this
    const index = task._nextIndex()
    task._setNext(async (x) => {
      const lineReader = Readline.createInterface({
        input: x.payload,
        crlfDelay: Infinity
      })
      for await (const line of lineReader) {
        await task._nextAtIndex(index)(Message(line))
      }
    })
    return task
  }
}
