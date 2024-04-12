'use strict'

import {
  Task,
  MakeStorage,
  StorageKind
} from '../index.js'

import os from 'os'
import fs from 'fs'
import { v4 as uuid } from 'uuid'

(async () => {
  const taskStorage = MakeStorage(StorageKind.Cassandra, null, 'v.test.1')
  const queueStorage = MakeStorage(StorageKind.Redis, null, 'task-test-1')
  const storage = MakeStorage(StorageKind.Memory, null, 'task-1')
  const length = 10
  const processes = 10
  const saveLatencyMs = 1000
  const id = os.hostname() + '.' + process.pid
  let start = new Date()

  const file = '/Users/as/Desktop/test.txt'

  const t = await Task()
    .parallel(processes, async x => {
        await Task().fromReadableStream(file).readline().tumblingWindowCount(storage, 1000, 200).enqueue(queueStorage).close()
    })
    //.fromReadableStream(file).readline()//.enqueue(queueStorage).close()
    .dequeue(queueStorage)
    .each()
    .fn(x => x !== undefined ? x.split(": ")[1] : null)
    .filter(x => x !== null && x !== undefined)
    .tokenize(" ")
    .each()
    .fn(x => {
      let z = {}
      z.str = x
      z.processIdentifier = id
      z.windowKey = id
      z.collectKey = 'vp'
      return z
    })
    .withStorage(taskStorage)
    .keyBy(x => x.windowKey)
    .sessionWindowTime(storage, saveLatencyMs)
    .fn(x => {
      console.log(x.length)
      return x
    })
    .collect(
      x => 'vp', 
      x => x.payload[0].collectKey, 
      x => x, 
      (x,y) => x.length == length,
      (x,y) => x.length == length && y[y.length - 1].processIdentifier == id
    )
    .fn(async x => {
      console.log('Write', process.pid, x.length, ((new Date()) - start) / 1000)
      return x
    })
    .groupBy(x => x.str)
    .sumMap()
    .fn(x => {
      console.log('Summed', process.pid, x.length, ((new Date()) - start) / 1000)
    })    
    .close()
})()









