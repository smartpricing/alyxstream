'use strict'

import { MakeWindowTumblingCount } from './window.js'
import * as Inactivity from './inactivityCheck.js'
import Message from '../message/message.js'

export default function (task, storage, maxSize, inactivityTimeMilliseconds = null) {
  const baseWindow = MakeWindowTumblingCount(storage)
  const index = task._nextIndex()

  task._setNext(async (element) => {
    const res = element
    let key = null

    if (res.metadata.key !== null && res.metadata.key !== undefined) {
      key = res.metadata.key
    }

    const winres = await baseWindow.push(key, res.payload, { maxSize })
    if (winres !== null) {
      if (inactivityTimeMilliseconds !== null) {
        Inactivity.unset(key)
      }
      await task._nextAtIndex(index)(Message(winres.payload, winres.metadata))
    } else if (inactivityTimeMilliseconds !== null) {
      Inactivity.set(task, index, baseWindow, key, inactivityTimeMilliseconds)
    }
  })

  return task
}
