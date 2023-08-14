'use strict'

import { 
	Task, 
	StorageKind,
	MakeStorage
} from '../index.js'

test('sumMap', async () => {
	const t = await Task()
	.fromObject({a: [1,2,3], b: [4,5,6,7,8,9]})
	.sumMap()
	.customFunction((x) => {
		expect(x).toStrictEqual({ a: 3, b: 6 })
	})	
	.close()
})

test('aggregate', async () => {
	const t = await Task()
	.fromArray([{x: 1}])
	.aggregate(MakeStorage(StorageKind.Memory, null, 'testid'), 'testaggreagate', x => x.x )
	.customFunction((x) => {
		expect(x).toStrictEqual({
			1: [{x: 1}]
		})
	})	
	.close()
})