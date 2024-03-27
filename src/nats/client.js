'use strict'

import { connect } from 'nats'

/** Nats client */
export default async function (server) {
  return await connect(server)
}
