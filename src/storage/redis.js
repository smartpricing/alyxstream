import Redis from 'ioredis'
import { RedisDefaultConfig } from '../config/storage.js'

export function Make (config, id) {
	const db = new Redis.default(config == null ? RedisDefaultConfig : config)
	return {
		_db: db,
		_id: id,

		db: function () {
			return this._db
		},

		_composeKey: function (key) {
			return  this._id + '.' + key
		},
		_composeMetadataKey: function (key) {
			return  this._id + '.' + key + '.metadata'
		},		

		set: async function (key, value) {
			const res = await db.set(this._composeKey(key), JSON.stringify(value))
			return null
		},

		push: async function (key, metadata, value) {
			await db.multi()
			.rpush(this._composeKey(key), JSON.stringify(value))
			.set(this._composeMetadataKey(key), JSON.stringify(metadata))
			.exec()
		},

		getMetadata: async function (key) {
			try {
				const res = await db.get(this._composeMetadataKey(key))
				const meta = JSON.parse(res)
				return meta == undefined ? null : meta
			} catch (e) {
				return null
			}
		},

		setMetadata: async function (key, metadata) {
			try {
				const res = await db.set(this._composeMetadataKey(key), JSON.stringify(metadata))
				return null
			} catch (e) {
				return e
			}
		},		

		get: async function (key) {
			try {
				const res = await db.get(this._composeKey(key))
				const meta = JSON.parse(res)
				return meta == undefined ? null : meta
			} catch (e) {
				return null
			}
		},

		getList: async function (key) {
			try {
				const res = await db.lrange(this._composeKey(key), 0, -1)
				return res.map(x => JSON.parse(x))
			} catch (e) {
				return null
			}
		},

		sliceCountAndGet: async function (key, sliceSize) {
			try {
				const res = await db.multi()
				.lpop(this._composeKey(key), sliceSize)
				.lrange(this._composeKey(key), 0, -1)
				.exec()
				return res[1][1].map(x => JSON.parse(x))
			} catch (e) {
				return e
			}				
		},

		sliceTime: async function (key, sliceSize) {
			try {
				let elements = (await db.lrange(this._composeKey(key), 0, -1)).map((v) => { return JSON.parse(v) }).reverse()
				for (var i = 0; i < elements.length; i += 1) {
					if ((new Date(elements[i].eventTime).getTime()) >= sliceSize) {
						await db.lpop(this._composeKey(key), i + 1)
						break
					}
				}
				return null
			} catch (e) {
				return e
			}				
		},		

		flush: async function (key, value) {
			await db.del(this._composeKey(key))
			await db.del(this._composeMetadataKey(key))
			return null
		},

		flushWindow: async function (key, value) {
			await db.del(this._composeKey(key))
			return null
		},	

		disconnect: async function () {
			await db.disconnect()
		},

		/**
		 * 	Queue base operations
		 */ 
		queueSize: async function (data) {
			return (await db.lrange(this._id, 0, -1)).length
		},
		enqueue: async function (data) {
			return await db.lpush(this._id, JSON.stringify(data))
		},
		dequeue: async function () {
			return JSON.parse((await db.brpop(this._id, 0))[1])
		},
	}
}