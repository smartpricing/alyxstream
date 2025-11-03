'use strict'

export default async function (kafkaClient, producerConfig = null) {
  let producer = null
  if (producerConfig === null) {
    producer = kafkaClient.producer()
  } else {
    // Support both { kafkaJS: {...} } and direct config
    const kafkaJSConfig = producerConfig.kafkaJS || producerConfig
    producer = kafkaClient.producer({ kafkaJS: kafkaJSConfig })
  }
  await producer.connect()
  return producer
}
