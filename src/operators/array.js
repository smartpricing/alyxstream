'use strict'

import Message from '../message/message.js'

export const map = {
    map (func) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            let newArray = []
            s.payload.forEach((x) => {
                newArray.push(func(x))
            })
            await task._nextAtIndex(index)(Message(newArray, s.metadata, s.globalState))
        })
        return task
    }
}

export const each = {
    each (func) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            for (const item of s.payload) {
                await task._nextAtIndex(index)(Message(item, s.metadata, s.globalState))    
            }
        })
        return task
    }
}

export const filterArray = {
    filterArray (cb) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            s.payload = s.payload.filter(cb)
            await task._nextAtIndex(index)(s)
        })
        return task
    }
}

export const flat = {
    flat () {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            s.payload = s.payload.flat()
            await task._nextAtIndex(index)(s)
        })
        return task
    }
}

export const reduce = {
    reduce (func) {
        if (func == null || func == undefined) {
            func = i => i
        }
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            s.payload = s.payload.flat()
            const sum = s.payload.reduce((partialSum, item) => partialSum + func(item), 0)
            await task._nextAtIndex(index)(Message(sum, s.metadata, s.globalState))
        })
        return task
    }
}

export const countInArray = {
    countInArray (cb) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            let counter = {}
            s.payload.forEach((i) => {
                let p = cb(i)
                if (counter[p] == undefined) {
                    counter[p] = 0
                }    
                counter[p] += 1            
            })

            await task._nextAtIndex(index)(Message(counter, s.metadata, s.globalState))
        })
        return task
    }
}

export const length = {
    length () {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            await task._nextAtIndex(index)(Message(s.payload.length, s.metadata, s.globalState))
        })
        return task
    }
}

export const groupBy = {
    groupBy (cb) {
        const task = this
        const index = task._nextIndex()
        task._setNext(async (s) => {
            const groupBy = (x, f) => {
                return x.reduce((a,b,i)=>((a[f(b,i,x)]||=[]).push(b),a),{})
            }            
            await task._nextAtIndex(index)(Message(groupBy(s.payload, cb), s.metadata, s.globalState))
        })
        return task
    }
}
