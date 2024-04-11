'use strict'

import {
  Task,
  MakeStorage,
  StorageKind
} from '../index.js'

import os from 'os'
import { v4 as uuid } from 'uuid'

(async () => {
  const taskStorage = MakeStorage(StorageKind.Cassandra, null, 'join.test.1')
  const storage = MakeStorage(StorageKind.Memory, null, 'task-1')
  const queueStorage = MakeStorage(StorageKind.Redis, null, 'task-queue-1')
  const length = 1000
  const processes = 10
  const id = os.hostname() + '.' + process.pid
  let start = new Date()

  const produceTask = await Task().enqueue(queueStorage)

  const t = await Task()
    .parallel(processes, async x => {
      for (var k = 0; k < 3; k +=1 ) { 
        const uuidId = uuid()
        for (var i = 0; i < length; i += 1) {
          await produceTask.inject({k: uuidId, v: i})
        }      
      }
    })
    .dequeue(queueStorage)
    .fn(x => {
      x.processPid = id
      x.windowKey = x.k + '#' + id
      return x
    })
    .withStorage(taskStorage)
    .keyBy(x => x.windowKey)
    .sessionWindowTime(storage, 200)
    .toStorageList(x => 'result.' + x.metadata.windowKey.split('#')[0], x => x)
    .fromStorageList(x => ['result.' + x.metadata.windowKey.split('#')[0]], x => [])
    .map(x => x.payload)
    .flat()
    .fn(async x => {
      const sorted = x.sort((a, b) => {
        return b.processPid - a.processPid
      })
      if (x.length == 0) {
        return null
      }
      const t = x[x.length - 1].processPid
      if (x.length == length && t == id) {
        console.log('#>', process.pid, x[0].k)
        return x
      }
      return null
    })
    .filter(x => x !== null)
    .flushStorage(x => ['result.' + x.payload[0].windowKey.split('#')[0]])
    .close()
})()
