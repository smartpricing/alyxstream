'use strict'

import WebSocket from 'ws'

export default async function (source) {
  return new WebSocket(source)
}