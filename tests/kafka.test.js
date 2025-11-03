'use strict'

import {
  Task,
  KafkaClient,
  KafkaAdmin,
  KafkaSink,
  KafkaSource
} from '../index.js'

const topic1 = 'test-topic-1'
const topic2 = 'test-topic-2'
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
  await ensureTopicExists(topic1)
  await ensureTopicExists(topic2)
})

afterAll(async () => {
  await admin.disconnect()
})

test('kafka producer and consumer with multiple topics', async () => {
  const sink = await KafkaSink(kafkaClient)
  
  const receivedMessages = []
  let resolvePromise
  const messagePromise = new Promise(resolve => {
    resolvePromise = resolve
  })

  const source = await KafkaSource(kafkaClient, {
    groupId: `test-group-multi-${Date.now()}`,
    autoCommit: true,
    topics: [
      { topic: topic1 },
      { topic: topic2 }
    ]
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

  // Wait for consumer to be ready and join the group
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Send messages after consumer is ready
  await sink.send({
    topic: topic1,
    messages: [
      { key: '1', value: JSON.stringify({ test: 'message1' }) }
    ]
  })
  
  await sink.send({
    topic: topic2,
    messages: [
      { key: '2', value: JSON.stringify({ test: 'message2' }) }
    ]
  })

  // Wait for messages with timeout
  await Promise.race([
    messagePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for messages')), 10000))
  ])

  expect(receivedMessages.length).toBe(2)
  expect(receivedMessages.some(m => m.test === 'message1')).toBe(true)
  expect(receivedMessages.some(m => m.test === 'message2')).toBe(true)
  await source.disconnect()
  await sink.disconnect()
}, 10000)

