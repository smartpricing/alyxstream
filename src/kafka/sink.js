'use strict'

export default async function (kafkaClient, producerConfig = null) {
  let producer = null
  if (producerConfig === null) {
    producer = kafkaClient.producer()
  } else {
    producer = kafkaClient.producer(producerConfig)
  }
  await producer.connect()
  return producer
}
