'use strict'

import Message from '../message/message.js'
import * as Queue from '../queue/queue.js'

export const queueSize = {
    queueSize (storage) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
        	const res = await Queue.queueSize(storage)
            await task._nextAtIndex(index)(Message(res))
        })
        return task
    }
}

export const enqueue = {
    enqueue (storage) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
        	await Queue.enqueue(storage, s.payload)
            await task._nextAtIndex(index)(s)
        })
        return task
    }
}

export const dequeue = {
    dequeue (storage) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
        	while (true) {
            	const mex = await Queue.dequeue(storage)
            	await task._nextAtIndex(index)(Message(mex))
        	}
        })
        return task
    }
}