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
  const length = 500
  const processes = 10
  const numberOfJobs = 10
  const saveLatencyMs = 200
  const id = os.hostname() + '.' + process.pid
  let start = new Date()

  const produceTask = await Task().enqueue(queueStorage)
  const t = await Task()
    .parallel(processes, async x => {
      for (var k = 0; k < numberOfJobs; k +=1 ) { 
        const uuidId = uuid()
        for (var i = 0; i < length; i += 1) {
          await produceTask.inject({k: uuidId, v: i})
        }      
      }
    })
    .dequeue(queueStorage)
    .fn(x => {
      x.processIdentifier = id
      x.windowKey = x.k + '#' + id
      x.collectKey = 'collect.' + x.k
      return x
    })
    .withStorage(taskStorage)
    .keyBy(x => x.windowKey)
    .sessionWindowTime(storage, saveLatencyMs)
    .collect(
      x => x.payload[0].k, 
      x => x.payload[0].collectKey, 
      x => x, 
      (y,x) => x.length == length,
      (y,x) => x.length == length && x[x.length - 1].processIdentifier == id
    )
    .fn(async x => {
      console.log('Write', process.pid, x[0].k, x.length)
    })
    .close()
})()









