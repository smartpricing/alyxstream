'use strict'

import WebSocket from 'ws'

export default async function (source, options) {
  return new WebSocket(source, options)
}