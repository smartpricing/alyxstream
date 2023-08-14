'use strict'

import Message from '../message/message.js'

export default async function (kafkaClient, consumerConfig) {
	const topics = consumerConfig.topics
	const observables = []
	
	let consumer = await kafkaClient.consumer({groupId: consumerConfig.groupId})
	for (const topic of topics) {
		await consumer.subscribe({ topic: topic.topic, fromBeginning: topic.fromBeginning })	
	}
	await consumer.connect()
	
	let onMessaggeAction = []
	for (const t of topics) {
		const autoHeartbeat = t.autoHeartbeat == undefined ? null : parseInt(t.autoHeartbeat)
		const payloadParser = typeof t.parseWith == 'function' ? t.parseWith : (v) => { return JSON.parse(v) }
		consumer.run({
			autoCommit: t.autoCommit == false ? false : true,
			eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
				let heartbeatInterval = null
				if (autoHeartbeat !== null && heartbeatInterval == null) {
					heartbeatInterval = setInterval(() => {
						heartbeat()
					}, autoHeartbeat)					
				}
				for (const action of onMessaggeAction) {
					try {
						await action(Message({
							topic: topic, 
							offset: message.offset,
							partition: partition, 
							headers: message.headers,
							key: message.key.toString(),
							value: payloadParser(message.value)
						}))	
					} catch (error) {
						console.log(new Date(), '#> Error at kafka source', error)
						if (heartbeatInterval !== null) {
							clearInterval(heartbeatInterval)	
						}						
					}				
				}
				if (heartbeatInterval !== null) {
					clearInterval(heartbeatInterval)	
				}
			},
		})			
	}
	return {
		stream: async (cb) => {  
			onMessaggeAction.push(cb)
		},
		consumer: () => { return consumer }
	}
}