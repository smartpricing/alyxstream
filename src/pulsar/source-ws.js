'use strict'

import WebSocket from 'ws'
import Message from '../message/message.js'

/**
* 	'non-persistent://public/default/my-topic-1'
*/ 
export default async function (sources) {
  	
  	let onMessaggeAction = []
 	const s = typeof sources == 'string' ? [sources] : sources
    const asyncSend = (_ws, mex) => {
        return new Promise((resolve, reject) => {
            _ws.send(mex, z => {
              	resolve()
            })
       })
    }    	
 	for (const t of s) {
 		let ws = null
		ws = new WebSocket(t)
		ws.on('message', async function (message) {
			try {
				let p = JSON.parse(message)
				p.payload = new Buffer(p.payload, 'base64').toString()
				for (const action of onMessaggeAction) {
					await action(Message(p))
				}
				const ackMsg = {'messageId' :p.messageId}
				await asyncSend(ws, JSON.stringify(ackMsg))
				//ws.send(JSON.stringify(ackMsg))
			} catch (error) {
				console.log(new Date(), '#> Error at pulsar source', error)
				throw error
			}					
		})
		ws.on('close', (x) => {})
	} 	
 		
	return {
		stream: async (cb) => {  
			onMessaggeAction.push(cb)
		},
		consumer: () => { }
	}
}