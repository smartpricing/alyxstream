'use strict'

import WindowTime from '../window/tumblingWindowTime.js'
import WindowCount from '../window/tumblingWindowCount.js'
import WindowSlidingCount from '../window/slidingWindowCount.js'
import WindowSlidingTime from '../window/slidingWindowTime.js'
import WindowSession from '../window/windowSession.js'
import WindowFixed from '../window/windowFixed.js'

export const tumblingWindowCount = {
  tumblingWindowCount (storage, countLength, inactivityTimeMilliseconds) {
    const task = this

    const win = WindowCount(
      task,
      storage,
      countLength,
      inactivityTimeMilliseconds)

    return win
  }
}

export const tumblingWindowTime = {
  tumblingWindowTime (storage, timeLengthMilliSeconds, inactivityTimeMilliseconds = null) {
    const task = this

    const win = WindowTime(
      task,
      storage,
      timeLengthMilliSeconds,
      inactivityTimeMilliseconds)

    return win
  }
}

export const sessionWindowTime = {
  sessionWindowTime (storage, inactivityTimeMilliseconds) {
    const task = this

    const win = WindowSession(
      task,
      storage,
      inactivityTimeMilliseconds)

    return win
  }
}

export const slidingWindowCount = {
  slidingWindowCount (storage, countLength, slidingLength, inactivityTimeMilliseconds) {
    const task = this

    const win = WindowSlidingCount(
      task,
      storage,
      countLength,
      slidingLength,
      inactivityTimeMilliseconds)

    return win
  }
}

export const slidingWindowTime = {
  slidingWindowTime (storage, timeLengthMilliSeconds, slidingLengthMilliSeconds, inactivityTimeMilliseconds) {
    const task = this

    const win = WindowSlidingTime(
      task,
      storage,
      timeLengthMilliSeconds,
      slidingLengthMilliSeconds,
      inactivityTimeMilliseconds)

    return win
  }
}

export const fixedWindow = {
  fixedWindow (storage, countLength, inactivityTimeMilliseconds) {
    const task = this

    const win = WindowFixed(
      task,
      storage,
      countLength,
      inactivityTimeMilliseconds)

    return win
  }
}
