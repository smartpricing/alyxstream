'use strict'

import {
  Task,
  MakeStorage,
  StorageKind
} from '../index.js'

(async () => {
  const winStorage = MakeStorage(StorageKind.Redis, null, 'win-queue-1-' + process.pid)
  const queueStorage = MakeStorage(StorageKind.Redis, null, 'task-queue-1')
  const length = 1000
  const id = process.pid

  const produceTask = await Task().enqueue(queueStorage)
  let start = new Date()
  const t = await Task()
    .parallel(2, async x => {
      for (var k = 0; k < 3; k +=1 ) { 
        for (var i = 0; i < length; i += 1) {
          await produceTask.inject({k: k.toString(), v: i})
        }      
      }
    })
    .dequeue(queueStorage)
    .keyBy(x => x.k)
    .tumblingWindowCount(winStorage, 10)
    .fn(x => {
      if (x.length == 0) {
        console.log(new Date(), process.pid, '#> L', x.length, x)  
      }
      
    })
    .close()
})()
