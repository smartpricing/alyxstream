'use strict'

import {
  Task,
  KafkaClient,
  KafkaAdmin,
  KafkaSink,
  KafkaSource
} from '../index.js'
import { Partitioners } from 'kafkajs'

const topic = 'test'
let kafkaClient
let admin

async function ensureTopicExists(topicName) {
  const existingTopics = await admin.listTopics()
  if (!existingTopics.includes(topicName)) {
    try {
      await admin.createTopics({
        topics: [{ topic: topicName, numPartitions: 1, replicationFactor: 1 }]
      })
    } catch (e) {
      if (e.name !== 'KafkaJSError' || !e.message.includes('TopicExistsException')) {
        throw e
      }
    }
  }
}

beforeAll(async () => {
  kafkaClient = KafkaClient({
    brokers: ['localhost:9092']
  })
  admin = await KafkaAdmin(kafkaClient)
  await ensureTopicExists(topic)
})

afterAll(async () => {
  await admin.disconnect()
})

test('kafka producer and consumer', async () => {
  const sink = await KafkaSink(kafkaClient, {
    createPartitioner: Partitioners.LegacyPartitioner
  })
  
  await sink.send({
    topic,
    messages: [
      { key: '1', value: JSON.stringify({ test: 'message1' }) },
      { key: '2', value: JSON.stringify({ test: 'message2' }) }
    ]
  })

  const receivedMessages = []
  let resolvePromise
  const messagePromise = new Promise(resolve => {
    resolvePromise = resolve
  })

  const source = await KafkaSource(kafkaClient, {
    groupId: 'test-group',
    topics: [{
      topic,
      fromBeginning: true,
      autoCommit: true
    }]
  })

  await Task()
    .fromKafka(source)
    .customFunction((x) => {
      receivedMessages.push(x.value)
      if (receivedMessages.length === 2) {
        resolvePromise()
      }
    })
    .close()

  await messagePromise

  expect(receivedMessages.length).toBe(2)
  expect(receivedMessages[0].test).toBe('message1')
  expect(receivedMessages[1].test).toBe('message2')
  await source.consumer().disconnect()
  await sink.disconnect()
})

