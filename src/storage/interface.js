'use strict'

import * as Memory from './memory.js'
import * as Redis from './redis.js'
import * as Cassandra from './cassandra.js'

export function Make (kind, config = null, id = null) {
	switch (kind) {
		case 'Memory':
			return Memory.Make()

		case 'Redis':
			if (id == null || typeof id !== 'string') {
				throw 'Id cannot be null and have to be a String'	
			}
			return Redis.Make(config, id)

		case 'Cassandra':
			if (id == null || typeof id !== 'string') {
				throw 'Id cannot be null and have to be a String'	
			}
			return Cassandra.Make(config, id)

		default:
			throw 'Unknown storage kind'
	}
}

export const Kind = {
	Memory: 'Memory',
	Redis:  'Redis',
	Cassandra: 'Cassandra'
}