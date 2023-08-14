'use strict'

import Message from '../message/message.js'

export const withStorage = {
    
    withStorage (storageInstance) {
        const task = this
        const index = task._nextIndex()
        task._storage = storageInstance
    	task._setNext(async (s) => {
            await task._nextAtIndex(index)(s)
        })
        return task
    },

    toStorage (keyFunction, valueFunction = null, ttl = null) {
        const task = this
        const index = task._nextIndex()
        const storage = task._storage
        task._setNext(async (s) => {
            const res = s
            const valueToSave = valueFunction == null ? res : valueFunction(res)
            await storage.set(keyFunction(res), valueToSave, ttl)
            await task._nextAtIndex(index)(s)
        })
        return task
    },

    fromStorage (keyFunction) {
        const task = this
        const index = task._nextIndex()
        const storage = task._storage
        task._setNext(async (s) => {
             const returnArray = s.payload
             for (const key of keyFunction(s)) {
                 const storedValue = await storage.get(key)
                 returnArray.push(storedValue)   
             }
             await task._nextAtIndex(index)(s)
        })
        return task
    },

    fromStorageToGlobalState (keyFunction) {
        const task = this
        const index = task._nextIndex()
        const storage = task._storage
        task._setNext(async (s) => {
            let map = {}
            for (const key of keyFunction(s)) {
               const storedValue = await storage.get(key)
               map[key] = storedValue
            }
            s.globalState = map
            await task._nextAtIndex(index)(s)
        })
        return task
    }, 

    disconnectStorage () {
        const task = this
        const index = task._nextIndex()
        const storage = task._storage  
        task._setNext(async (s) => {
            await storage.disconnect()
            await task._nextAtIndex(index)(s)
        })
        return task              
    },

    flushStorage () {
        const task = this
        const index = task._nextIndex()
        const storage = task._storage  
        task._setNext(async (s) => {
            await storage.flush()
            await task._nextAtIndex(index)(s)
        })
        return task  
    },   

    storage () {
        return task._storage
    }

}