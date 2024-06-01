/**
CREATE KEYSPACE alyxstream WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 1};

create table alyxstream.storage (
  id text,
  key text,
    value text,
    s_uuid uuid,
    PRIMARY KEY (id, key)
);

create table alyxstream.liststorage (
  id text,
  key text,
  s_uuid timeuuid,
    value text,
    PRIMARY KEY (id, key, s_uuid)
) with clustering order by (key asc, s_uuid asc);
**/

'use strict'

import cassandra from 'cassandra-driver'
import { CassandraDefaultConfig } from '../config/storage.js'

export function Make (config, id) {
  const _config = config == null ? CassandraDefaultConfig : config
  const db = new cassandra.Client(_config)
  return {

    id: function () {
      return id
    },

    db: function () {
      return db
    },

    set: async function (key, value, ttl = null) {
      if (ttl == null) {
        await db.execute('UPDATE storage SET value=?, s_uuid=uuid() WHERE id=? AND key=?',
          [JSON.stringify(value), id, key],
          { prepare: true, consistency: 'all' })
      } else {
        await db.execute('UPDATE storage USING TTL ? SET value=?, s_uuid=uuid() WHERE id=? AND key=?',
          [parseInt(ttl), JSON.stringify(value), id, key],
          { prepare: true, consistency: 'all' })
      }
    },

    get: async function (key) {
      const result = await db.execute('SELECT id, key, value from storage WHERE id=? AND key=?',
        [id, key],
        { prepare: true })
      if (result.rows.length === 1) {
        return result.rows.map((r) => { return JSON.parse(r.value) })[0]
      } if (result.rows.length === 0) {
        return null
      } else {
        return result.rows.map((r) => { return JSON.parse(r.value) })
      }
    },

    push: async function (key, value) {
      try {
        await db.execute('INSERT INTO liststorage (id, key, s_uuid, value) VALUES (?,?,now(),?)',
          [id, key, JSON.stringify(value)],
          { prepare: true, consistency: 'all' })
      } catch (error) {
        console.log(new Date(), '#> Error at cassandra push', error)
      }
    },

    pushId: async function (id, key, value) {
      try {
        await db.execute('INSERT INTO liststorage (id, key, s_uuid, value) VALUES (?,?,now(),?)',
          [id, key, JSON.stringify(value)],
          { prepare: true, consistency: 'all' })
      } catch (error) {
        console.log(new Date(), '#> Error at cassandra push', error)
      }
    },

    getList: async function (key) {
      const result = []
      const stream = db.stream('SELECT id, key, value, s_uuid from liststorage WHERE id=? AND key=?', [id, key], { prepare: true, fetchSize: 100 })
      for await (const row of stream) {
        result.push(row)
      }
      return result.map((r) => { return JSON.parse(r.value) })
    },

    getListId: async function (id, key) {
      const result = []
      const stream = db.stream('SELECT id, key, value, s_uuid from liststorage WHERE id=? AND key=?', [id, key], { prepare: true, fetchSize: 100 })
      for await (const row of stream) {
        result.push(row)
      }
      return result.map((r) => { return JSON.parse(r.value) })
    },

    flush: async function (key) {
      await db.execute('DELETE from liststorage WHERE id=? AND key=?',
        [id, key],
        { prepare: true, consistency: 'all' })
    },

    slice: async function (key, numberOfItemsToRemove) {
      const result = await db.execute('SELECT id, s_uuid, key FROM liststorage WHERE id=? AND key=?',
        [id, key],
        { prepare: true })
      const elements = result.rows
      for (let i = 0; i < numberOfItemsToRemove; i += 1) {
        await db.execute('DELETE FROM liststorage WHERE id=? AND key=? AND s_uuid=?', [id, key, elements[i].s_uuid])
      }
    },

    sliceByTime: async function (key, startTime) {
      const result = await db.execute('SELECT id, s_uuid, key, value FROM liststorage WHERE id=? AND key=?',
        [id, key],
        { prepare: true })
      const elements = result.rows
      for (let i = 0; i < elements.length; i += 1) {
        elements[i].value = JSON.parse(elements[i].value)
        if ((new Date(elements[i].value.eventTime).getTime()) <= startTime) {
          await db.execute('DELETE FROM liststorage WHERE id=? AND key=? AND s_uuid=?', [
            id, key, elements[i].s_uuid
          ])
        } else {
          break
        }
      }
    },

    disconnect: async function () {
      await db.shutdown()
    },

    flushStorage: async function () {
      await db.execute('DELETE FROM liststorage WHERE id=?', [id], { prepare: true })
      await db.execute('DELETE FROM storage WHERE id=?', [id], { prepare: true })
    },

    flushStorageId: async function (id) {
      await db.execute('DELETE FROM liststorage WHERE id=?', [id], { prepare: true })
      await db.execute('DELETE FROM storage WHERE id=?', [id], { prepare: true })
    }

  }
}
