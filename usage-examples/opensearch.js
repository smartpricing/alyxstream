'use strict'

import {
  MakeStorage,
  StorageKind,
} from '../index.js'

(async () => {
  const config = process.env.OPENSEARCH_CONNECTION_URL
  const storage = MakeStorage(StorageKind.Opensearch, config, 'alyxstream-opensearch-example')
  const db = await storage.db()
  console.log(db)
})()
