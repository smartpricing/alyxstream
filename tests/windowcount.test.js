'use strict'

import { randomBytes } from 'crypto';

import {
  Task,
  StorageKind,
  MakeStorage
} from '../index.js'

const testData = [1, 2, 3]

test('tumblingWindowCountMemory', async () => {
  const key = randomBytes(20).toString('hex')

  const t = await Task()
    .fromArray(testData)
    .tumblingWindowCount(MakeStorage(StorageKind.Memory, null, key), 3)
    .customFunction((x) => {
      expect(x).toStrictEqual([1, 2, 3])
    })
    .close()
})

test('tumblingWindowCountRedis', async () => {
  const key = randomBytes(20).toString('hex')

  const rs = MakeStorage(StorageKind.Redis, null, key)
  const t = await Task()
    .withStorage(rs)
    .flushStorage(x => [key])
    .fromArray(testData)
    .tumblingWindowCount(rs, 3)
    .customFunction((x) => {
      expect(x).toStrictEqual([1, 2, 3])
    })
    .close()

  setTimeout(async () => {
    await rs.disconnect()
  }, 200)
})
