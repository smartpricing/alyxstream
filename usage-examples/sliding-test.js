'use strict'

import {
  Task,
  MakeStorage,
  StorageKind
} from '../index.js'

(async () => {
  let totalIn = 0
  let totalOut = 0

  const winStorage = MakeStorage(StorageKind.Memory, null, 'win-queue-10')
  let start = new Date()
  const t = await Task()
  .keyBy(x => x.k)
  .withEventTime(x => x.date)
  .slidingWindowTime(winStorage, 1000, 500, 500)
  .fn(x => {
      console.log(new Date(), process.pid, '#> L', x.length, x[0].date.getTime(), x[x.length - 1].date.getTime(), (x[x.length - 1].date - x[0].date) / 1000)  
  })
    
  for (var i = 1; i < 10000; i += 1) {
    await t.inject({k: "1", v: i, date: new Date()})
    totalIn += 1
    await new Promise(resolve => setTimeout(resolve, 10))
    if (i%1000 == 0) {
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
  }

})()
