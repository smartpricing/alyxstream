'use strict'

import {
  Task,
  MakeStorage,
  StorageKind
} from '../index.js'

(async () => {
  const storage = MakeStorage(StorageKind.Cassandra, null, 'task-1')
  const queueStorage = MakeStorage(StorageKind.Redis, null, 'task-queue-1')
  const length = 1000
  const id = process.pid

  const produceTask = await Task().enqueue(queueStorage)
  let start = new Date()
  const t = await Task()
    .parallel(3, async x => {
      for (var k = 0; k < 3; k +=1 ) { 
        for (var i = 0; i < length; i += 1) {
          await produceTask.inject({k: k.toString(), v: i})
        }      
      }
    })
    .dequeue(queueStorage)
    .keyBy(x => x.k)
    .fixedWindow(storage, length)
    .fn(x => {
      console.log(process.pid, x.length, x[0], (new Date() - start) / 1000)
      start = new Date()
    })
    .close()
})()
