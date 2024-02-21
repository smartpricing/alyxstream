'use strict'

import fs from 'fs'
import zlib from 'zlib'

import Message from '../message/message.js'

export const fromKafka = {
    fromKafka (source) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async () => {
            await source.stream(async (message) => {
                await task._nextAtIndex(index)(message)
            })
        })
        return task
    }
}

export const fromArray = {
    fromArray (array) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async () => {
            for (const element of array) {
                await task._nextAtIndex(index)(Message(element))
            }
        })
        return task
    }
}

export const fromObject = {
    fromObject (array) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async () => {
            await task._nextAtIndex(index)(Message(array))
        })
        return task
    }
}

export const fromString = {
    fromString (string) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async () => {
            await task._nextAtIndex(index)(Message(string))
        })
        return task
    }
}

export const fromInterval = {
    fromInterval (intervalMilliseconds, generatorFunction = null, maxSize = null) {
        const task = this
        const index = task._nextIndex()
        let counter = 0
        task._setNext(async () => {
            while (true) {
                await new Promise(r => setTimeout(r, intervalMilliseconds))
                const generated = generatorFunction == null ? counter : generatorFunction(counter)
                await task._nextAtIndex(index)(Message(generated))
                counter += 1
                if (maxSize !== null && counter >= maxSize) {
                    break
                }
            }
        })
        return task
    }
}

export const fromReadableStream = {
    fromReadableStream (filepath, useZlib = false) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async () => {
            let stream = fs.createReadStream(filepath)
            if (useZlib == true && /\.gz$/i.test(filepath)) {
                stream = stream.pipe(zlib.createGunzip())
            }            
            await task._nextAtIndex(index)(Message(stream))
        })
        return task
    }
}