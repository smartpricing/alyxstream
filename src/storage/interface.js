'use strict'

import * as Memory from './memory.js'
import * as Redis from './redis.js'
import * as Cassandra from './cassandra.js'
import * as Etcd from './etcd.js'
import * as Postgres from './postgres.js'

export function Make (kind, config = null, id = null) {
  switch (kind) {
    case 'Memory':
      return Memory.Make()

    case 'Redis':
      if (id === null || typeof id !== 'string') {
        throw new Error('Id cannot be null and have to be a String')
      }
      return Redis.Make(config, id)

    case 'Postgres':
      if (id === null || typeof id !== 'string') {
        throw new Error('Id cannot be null and have to be a String')
      }
      return Postgres.Make(config, id)

    case 'Cassandra':
      if (id === null || typeof id !== 'string') {
        throw new Error('Id cannot be null and have to be a String')
      }
      return Cassandra.Make(config, id)

    case 'Etcd':
      if (id === null || typeof id !== 'string') {
        throw new Error('Id cannot be null and have to be a String')
      }
      return Etcd.Make(config, id)

    default:
      throw new Error('Unknown storage kind')
  }
}

export const Kind = {
  Memory: 'Memory',
  Redis: 'Redis',
  Cassandra: 'Cassandra',
  Etcd: 'Etcd',
  Postgres: 'Postgres'
}
