'use strict'

export default function (payload, metadata = {}, globalState = {}) {
  const message = {
    payload,
    metadata,
    globalState
  }
  return message
}
