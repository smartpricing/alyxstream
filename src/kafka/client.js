'use strict'

import { Kafka } from 'kafkajs'

/** Kafkajs client */
export default function (clientConfig) {
	return new Kafka(clientConfig)
}