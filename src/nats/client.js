'use strict'

import { connect, StringCodec } from 'nats'

/** Nats client */
export default async function (server) {
	return await connect(server)
}