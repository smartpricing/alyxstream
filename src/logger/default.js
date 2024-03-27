'use strict'

const appLogLevel = process.env.ALYXSTREAM_LOG_LEVEL === undefined ? 'info' : process.env.ALYXSTREAM_LOG_LEVEL

export default function (level, itemsAry) {
  switch (level) {
    case 'info':
      if (appLogLevel === 'info' || appLogLevel === 'debug') {
        console.log(new Date(), '#>', ...itemsAry)
      }
      break
    case 'warning':
      if (appLogLevel === 'info' || appLogLevel === 'warning' || appLogLevel === 'debug') {
        console.log(new Date(), '#>', ...itemsAry)
      }
      break
    case 'debug':
      if (appLogLevel === 'debug') {
        console.log(new Date(), '#>', ...itemsAry)
      }
      break
    default:
      break
  }
}
