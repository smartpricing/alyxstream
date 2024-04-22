import pg from 'pg'
import { PgDefaultConfig } from '../config/storage.js'

const { Client } = pg
export function Make (config, id) {
  const db = new Client(config == null ? PgDefaultConfig : config)
  return {
    _db: db,
    _id: id,

    db: function () {
      return this._db
    }
  }
}
