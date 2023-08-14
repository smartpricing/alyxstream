'use strict'

import { 
	Task,
	StorageKind,
	MakeStorage
} from '../index.js'

const testData = [1,2,3]

test('tumblingWindowCountMemory', async () => {
	const t = await Task()
	.fromArray(testData)
	.tumblingWindowCount(MakeStorage(StorageKind.Memory, null, 'test'), 3)
	.customFunction((x) => {
		expect(x).toStrictEqual([1,2,3])
	})
	.close()
})

test('tumblingWindowCountRedis', async () => {
	const rs = MakeStorage(StorageKind.Redis, null, 'test')
	const t = await Task()
	.withStorage(rs)
	.flushStorage()
	.fromArray(testData)
	.tumblingWindowCount(rs, 3)
	.customFunction((x) => {
		expect(x).toStrictEqual([1,2,3])
	})
	.close()
	
	setTimeout(async () => {
		await rs.disconnect()	
	}, 200)
})
