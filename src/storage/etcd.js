'use strict'

import { Etcd3 } from 'etcd3'
import Log from '../logger/default.js'

export function Make (config, id) {
  const db = config == null ? new Etcd3() : new Etcd3(config)
  const lockMap = {}
  return {
    _db: db,
    state: {},
    _id: id,

    db: async function () {
      return this.db
    },

    lock: async function (lockKey) {
      try {
        lockMap[lockKey] = await db.lock(lockKey).acquire()
        Log('debug', [process.pid, 'Lock acquired', lockKey])
        return lockMap[lockKey]
      } catch (error) {
        Log('debug', [process.pid, 'Is already locked', error])
        return null
      }
    },

    release: async function (lockKey) {
      try {
        if (lockMap[lockKey] === undefined) {
          Log('debug', [process.pid, 'Lock not present', lockKey])
          return true
        }
        await lockMap[lockKey].release()
        Log('debug', [process.pid, 'Lock released', lockKey])
        return true
      } catch (error) {
        Log('debug', [process.pid, 'Failed to release lock', error])
        return null
      }
    },

    getCounter: async function (lockKey) {
      try {
        const value = await db.get(lockKey).string()
        return value.length === 0 ? 0 : parseInt(value)
      } catch (error) {
        return null
      }
    },

    setCounter: async function (lockKey, value) {
      try {
        const valueRes = await db.put(lockKey).value(`${value}`)
        return valueRes
      } catch (error) {
        return null
      }
    }
  }
}
