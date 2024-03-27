'use strict'

import { Task } from '../index.js'

test('setMetadata', async () => {
  const t = await Task()
    .withMetadata()
    .setMetadata('111')

  	expect(t._metadata.id).toBe('111')
})

test('fromInterval', async () => {
  const t = await Task()
    .fromInterval(1, x => x, 1)
    .customFunction((x) => {
      expect(x).toBe(0)
    })
    .close()
})

test('fromIntervalGenerator', async () => {
  const t = await Task()
    .fromInterval(1, x => { return { y: x } }, 1)
    .customFunction((x) => {
      expect(x.y).toBe(0)
    })
    .close()
})

test('fromString', async () => {
  const t = await Task()
    .fromString('alice')
    .customFunction((x) => {
      expect(x).toBe('alice')
    })
    .close()
})
