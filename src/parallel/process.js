'use strict'

import cluster from 'node:cluster'
import Message from '../message/message.js'

export const parallel = {
    parallel (numberOfProcess, produceFunction = null) {
        const task = this
        const index = task._nextIndex()

		if (cluster.isPrimary) {		
  			for (let i = 0; i < numberOfProcess; i++) {
  				console.log('Forking', i)
  			  	cluster.fork()
  			}
		} 
        task._setNext(async () => {
  			if (cluster.isPrimary && produceFunction !== null) {
  				await produceFunction()
  			}        	
            await task._nextAtIndex(index)(Message(null))
        })
        return task
    }
}