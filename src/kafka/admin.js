'use strict'

import { Kafka } from 'kafkajs'

/** Kafkajs admi client */
export default async function (kafkaClient) {
	const admin = kafkaClient.admin()
	await admin.connect()
	return admin
}