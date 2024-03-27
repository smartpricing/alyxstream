'use strict'

import { Task } from '../index.js'

test('fromArray', async () => {
  const t = await Task()
    .fromArray([1])
    .customFunction((x) => {
      expect(x).toBe(1)
    })
    .close()
})

test('fromObject', async () => {
  const t = await Task()
    .fromObject([1, 2, 3])
    .customFunction((x) => {
      expect(x).toStrictEqual([1, 2, 3])
    })
    .close()
})

test('map', async () => {
  const t = await Task()
    .fromObject([1, 2, 3])
    .map(x => x += 1)
    .customFunction((x) => {
      expect(x).toStrictEqual([2, 3, 4])
    })
    .close()
})

test('each', async () => {
  const t = await Task()
    .fromObject([1])
    .each(x => x)
    .customFunction((x) => {
      expect(x).toStrictEqual(1)
    })
    .close()
})

test('filterArray', async () => {
  const t = await Task()
    .fromObject([1, 2, 3, 4])
    .filterArray(x => x % 2 == 0)
    .customFunction((x) => {
      expect(x).toStrictEqual([2, 4])
    })
    .close()
})

test('reduce', async () => {
  const t = await Task()
    .fromObject([1, 2, 3])
    .reduce(x => x)
    .customFunction((x) => {
      expect(x).toBe(6)
    })
    .close()
})

test('flat', async () => {
  const t = await Task()
    .fromObject([[1], [2]])
    .flat()
    .customFunction((x) => {
      expect(x).toStrictEqual([1, 2])
    })
    .close()
})

test('countInArray', async () => {
  const t = await Task()
    .fromObject([1, 2, 3, 1, 2, 1])
    .countInArray(x => x)
    .customFunction((x) => {
      expect(x).toStrictEqual({ 1: 3, 2: 2, 3: 1 })
    })
    .close()
})

test('length', async () => {
  const t = await Task()
    .fromObject([1, 2, 3, 1, 2, 1])
    .length()
    .customFunction((x) => {
      expect(x).toBe(6)
    })
    .close()
})

test('groupBy', async () => {
  const t = await Task()
    .fromObject([1, 2, 3, 1, 2, 1])
    .groupBy(x => x)
    .customFunction((x) => {
      expect(x).toStrictEqual({ 1: [1, 1, 1], 2: [2, 2], 3: [3] })
    })
    .close()
})
