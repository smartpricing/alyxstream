'use strict'

import { 
	Task,
	StorageKind,
	MakeStorage
} from '../index.js'

const testData = [
	{ value: 1, date: '2023-02-01T00:00:00.000Z' },
	{ value: 2, date: '2023-02-01T00:01:00.000Z' },
	{ value: 3, date: '2023-02-01T00:02:59.999Z' },
	{ value: 4, date: '2023-02-01T00:03:01.000Z' },
]

test('tumblingWindowTimeMemory', async () => {
	const t = await Task()
	.fromArray(testData)
	.withDefaultKey()
	.withEventTime(x => new Date(x.date))
	.tumblingWindowTime(MakeStorage(StorageKind.Memory, null, 'testtime'), 1000 * 60 * 3)
	.map(x => x.value)
	.customFunction((x) => {
		expect(x).toStrictEqual([1,2,3])
	})
	.close()
})

test('tumblingWindowTimeRedis', async () => {
	const storage = MakeStorage(StorageKind.Redis, null, 'testtime')
	const t = await Task()
	.withStorage(storage)
	.flushStorage('testtime')
	.fromArray(testData)
	.withDefaultKey()
	.withEventTime(x => new Date(x.date))
	.tumblingWindowTime(storage, 1000 * 60 * 3)
	.map(x => x.value)
	.customFunction((x) => {
		expect(x).toStrictEqual([1,2,3])
	})
	.close()

	setTimeout(x => {
		storage.disconnect()
	}, 500)
})

