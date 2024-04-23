'use strict'

import {
  Task,
  MakeStorage,
  StorageKind
} from '../index.js'
import {
  Mutex,
  StorageKind as MutexSKind
} from 'smartlocks'
function randomInteger (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

//const lockStorage = MakeStorage(StorageKind.Etcd, { hosts: ['http://localhost:2379'], auth: { password: 'kB6vsrAHMo', username: 'root' } }, 'myeetcd')

const mutex = Mutex(MutexSKind.Cassandra, null)
const queueStorage = MakeStorage(StorageKind.Redis, null, 'my-queue-lock')
const queueStorageOutput = MakeStorage(StorageKind.Redis, null, 'my-queue-lock-output')

// Worker
await Task()
.parallel(5)
.dequeue(queueStorage)
.print('>')
.fn(x => {
  x.i * 2
  console.log(process.pid, x.i)
  return x
})
.enqueue(queueStorageOutput)
.close()

// Producer
const producer = await Task()
.withLocalKVStorage()
.setLocalKV('lock-key', x => x[0].a)
.lock(mutex, x => x[0].a)
.fn(x => {
  console.log(x)
  return x
})
.branch([
  async (x) => { return await Task().each().enqueue(queueStorage).inject(x) }
])
.getLocalKV('lock-key')
.release(mutex, x => x)

// Reader
const reader = Task()
.lock(mutex, x => 'olyonereader')
.filter(x => x !== null)
.dequeue(queueStorageOutput)
.tumblingWindowCount(MakeStorage(StorageKind.Memory, null, 2), 1000, 10000)
.fn(x => {
  console.log(process.pid, 'is master read', x.length)
  return x
})
.release(mutex, x => 'olyonereader')
.close()

let jobs = []
for (var i = 0; i < 1000; i += 1) {
  jobs.push({
    a: 'mytest', i: i
  })
}
await producer.inject(jobs)
await reader