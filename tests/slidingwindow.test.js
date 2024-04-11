'use strict'

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

test('slidingWindowTimeMemory', async () => {
  const t = await Task()
    .fromArray(testData)
    .withDefaultKey()
    .withEventTime(x => new Date(x.date))
    .slidingWindowTime(MakeStorage(StorageKind.Memory, null, 'testslide'), 4000, 500)
    .map(x => x.value)
    .customFunction((x) => {
      expect(x).toStrictEqual([1, 2, 3])
    })
    .close()
})

test('slidingWindowTimeRedis', async () => {
  const storage = MakeStorage(StorageKind.Redis, null, 'testslide')
  const t = await Task()
    .withStorage(storage)
    .flushStorage(x => ['testslide'])
    .fromArray(testData)
    .withDefaultKey()
    .withEventTime(x => new Date(x.date))
    .slidingWindowTime(storage, 4000, 500)
    .map(x => x.value)
    .customFunction((x) => {
      expect(x).toStrictEqual([1, 2, 3])
    })
    .close()

  setTimeout(x => {
    storage.disconnect()
  }, 500)
})
