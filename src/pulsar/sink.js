'use strict'

export default async function (pulsarClient, producerConfig = null) {
  return await pulsarClient.createProducer(producerConfig)
}