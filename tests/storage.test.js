'use strict'

import {
  Task,
  StorageKind,
  MakeStorage
} from '../index.js'

test('withMemoryStorage', async () => {
  const t = await Task()
    .withStorage(MakeStorage(StorageKind.Memory, null, 'test'))
    .flushStorage('test')
    .fromString('alice')
    .toStorage(x => 'myname', x => x)
    .fromStorageToGlobalState(x => ['myname'])
    .customFunctionRaw((x) => {
      expect(x.globalState.myname.payload).toStrictEqual('alice')
    })
    .close()
})

test('withRedisStorage', async () => {
  const t = await Task()
    .withStorage(MakeStorage(StorageKind.Redis, null, 'test'))
    .flushStorage('test')
    .fromString('alice')
    .toStorage(x => 'myname', x => x)
    .fromStorageToGlobalState(x => ['myname'])
    .customFunctionRaw((x) => {
      expect(x.globalState.myname.payload).toStrictEqual('alice')
    })
    .disconnectStorage()
    .close()
})

test('withCassandraStorage', async () => {
  const t = await Task()
    .withStorage(MakeStorage(StorageKind.Cassandra, null, 'test'))
    .flushStorage('test')
    .fromString('alice')
    .toStorage(x => 'myname', x => x)
    .fromStorageToGlobalState(x => ['myname'])
    .customFunctionRaw((x) => {
      expect(x.globalState.myname.payload).toStrictEqual('alice')
    })
    .disconnectStorage()
    .close()
})
