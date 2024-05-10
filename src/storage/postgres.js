import pg from 'pg'
import { PgDefaultConfig } from '../config/storage.js'

const { Client, Pool } = pg
export function Make (config, id) {
  const standardClient = new Client(config == null ? PgDefaultConfig : config)
  const poolClient = new Pool(config == null ? PgDefaultConfig : config)
  return {
    _client: standardClient,
    _poolClient: poolClient,
    _id: id,

    client: function () {
      return this._client
    },
    poolClient: function () {
      return this._poolClient
    }
  }
}
