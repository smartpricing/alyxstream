'use strict'

import { randomBytes } from 'crypto';
import cassandra from 'cassandra-driver'

import {
  Task,
  StorageKind,
  MakeStorage
} from '../index.js'

test('withMemoryStorage', async () => {
  const t = await Task()
    .withStorage(MakeStorage(StorageKind.Memory, null, 'test'))
    .flushStorage(x => ['test'])
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
    .flushStorage(x => ['test'])
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
  // ==== SETUP ==== //
  const client = new cassandra.Client({
    contactPoints: ['localhost:9042'],
    localDataCenter: 'datacenter1',
  });

  await client.connect()

  const keyspace = 'alyxstream'
  const queries = [
    `
    CREATE KEYSPACE IF NOT EXISTS ${keyspace}
    WITH replication = {
      'class': 'SimpleStrategy',
      'replication_factor': 1
    }`,
    `CREATE TABLE IF NOT EXISTS ${keyspace}.storage (
      id text,
      key text,
      value text,
      s_uuid uuid,
      PRIMARY KEY (id, key)
    )`,
    `CREATE TABLE IF NOT EXISTS ${keyspace}.liststorage(
      id text,
      key text,
      s_uuid uuid,
      value text,
      PRIMARY KEY(id, key, s_uuid)
    ) WITH CLUSTERING ORDER BY(key asc, s_uuid asc)`
  ];

  try {
    for (const query of queries) {
      await client.execute(query)
    }
  } catch (error) {
    console.error('failed to initialize cassandra for tests', error)
    throw error
  } finally {
    await client.shutdown()
  }

  // ==== TEST ==== //
  const key = randomBytes(20).toString('hex')

  const t = await Task()
    .withStorage(MakeStorage(StorageKind.Cassandra, null, 'test'))
    .flushStorage(x => ['test'])
    .fromString('alice')
    .toStorage(x => key, x => x)
    .fromStorageToGlobalState(x => [key])
    .customFunctionRaw((x) => {
      expect(x.globalState?.[key].payload).toStrictEqual('alice')
    })
    .disconnectStorage()
    .close()
})
