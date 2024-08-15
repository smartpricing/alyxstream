'use strict'

import { MakeWindowSlidingTime } from './window.js'
import * as Inactivity from './inactivityCheck.js'
import Message from '../message/message.js'

export default function (task, storage, timeMilliSeconds, slidingLengthMilliSeconds, inactivityTimeMilliseconds = null) {
  const baseWindow = MakeWindowSlidingTime(storage)
  const index = task._nextIndex()

  task._setNext(async (element) => {
    const res = element
    let key = null

    if (res.metadata.key !== null && res.metadata.key !== undefined) {
      key = res.metadata.key
    }

    let eventTime = res.metadata.eventTime
    if (eventTime === null || eventTime === undefined) {
      // Switch to processing time if eventTime is not defined
      eventTime = new Date()
    }
    const watermark = eventTime.getTime()

    // const roundTo = roundTo => x => Math.round(x / roundTo) * roundTo
    const roundDownTo = roundTo => x => Math.floor(x / roundTo) * roundTo
    const roundUpTo = roundTo => x => Math.ceil(x / roundTo) * roundTo

    const startTimestamp = roundDownTo(timeMilliSeconds)(eventTime)
    let endTimestamp = roundUpTo(timeMilliSeconds)(eventTime)

    // This is needed because the round functions does not work
    // when the eventTime is aligned with the epoch (edge case)
    if (startTimestamp === endTimestamp) {
      endTimestamp = roundUpTo(timeMilliSeconds)(watermark + 1)
    }
    const winres = await baseWindow.push(key, {
      element: res.payload,
      eventTime: watermark
    }, {
      winSize: timeMilliSeconds,
      slideSize: slidingLengthMilliSeconds,
      startTimestamp,
      endTimestamp,
      eventTime: watermark,
      eventTimeDate: eventTime,
    })
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
