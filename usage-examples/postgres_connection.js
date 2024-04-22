'use strict'

import {
  Task,
  MakeStorage,
  StorageKind,
  KafkaSource,
  KafkaClient,
  KafkaCommit,
  KafkaSink
} from '../index.js'

/**
 * 	In order to run this example, you will need a
 * 	Kafka or Redpanda broker on your local machine.
 */

(async () => {
  const config = {
    user: 'athena',
    host: 'localhost',
    database: 'athena',
    password: 'password'
  }
  const storage = MakeStorage(StorageKind.Postgres, config, 'alyxstream-postgres-example')
  const db = await storage.db()
  console.log(db)
})()
