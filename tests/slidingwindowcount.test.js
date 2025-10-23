'use strict'

import { randomBytes } from 'crypto';

import {
  Task,
  StorageKind,
  MakeStorage
} from '../index.js'

const testData = [
  { value: 1, date: '2023-02-01T00:00:01.000Z' },
  { value: 2, date: '2023-02-01T00:00:02.000Z' },
  { value: 3, date: '2023-02-01T00:00:03.000Z' },
  { value: 4, date: '2023-02-01T00:00:10.000Z' }
]

test('slidingWindowCountMemory', async () => {
  const key = randomBytes(20).toString('hex')

  const t = await Task()
    .fromArray(testData)
    .withDefaultKey()
    .slidingWindowCount(MakeStorage(StorageKind.Memory, null, key), 3, 2)
    .map(x => x.value)
    .customFunction((x) => {
      expect(x).toStrictEqual([1, 2, 3])
    })
    .close()
})

test('slidingWindowCountRedis', async () => {
  const key = randomBytes(20).toString('hex')

  const storage = MakeStorage(StorageKind.Redis, null, key)
  const t = await Task()
    .withStorage(storage)
    .flushStorage(x => [key])
    .fromArray(testData)
    .withDefaultKey()
    .slidingWindowCount(storage, 3, 2)
    .map(x => x.value)
    .customFunction((x) => {
      expect(x).toStrictEqual([1, 2, 3])
    })
    .close()

  setTimeout(x => {
    storage.disconnect()
  }, 500)
})
