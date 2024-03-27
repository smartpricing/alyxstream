'use strict'

import Pulsar from 'pulsar-client'

/** Pulsar client */
export default function (clientConfig) {
  return new Pulsar.Client(clientConfig)
}
