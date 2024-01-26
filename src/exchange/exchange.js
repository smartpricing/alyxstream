'use strict'

import { 
	Task, 
	KafkaSource, 
	KafkaClient, 
	KafkaSink
} from '../../index.js';

export default async function (client, topic, groupId, sourceOptions = {}, sinkOptions = {}) {
	const source = await KafkaSource(client, {
		groupId: groupId,
		topics: [{
			topic: topic, 
			fromBeginning: sourceOptions.fromBeginning == undefined ? false : sourceOptions.fromBeginning,
			autoCommit: sourceOptions.autoCommit == undefined ? true : sourceOptions.autoCommit,
			autoHeartbeat: sourceOptions.autoHeartbeat == undefined ? null : sourceOptions.autoHeartbeat,
		}]	
	})
	const sink = await KafkaSink(client)

	let keyFromMex =  (mex) => mex.metadata.key || null

	let validateMex = (mex) => {
		if (mex.kind == undefined || mex.kind == null) {
			return false
		}
		if (mex.metadata == undefined || mex.metadata == null) {
			return false
		}	
		if (mex.metadata.key == undefined || mex.metadata.key == null || typeof mex.metadata.key !== 'string') {
			return false
		}	
		if (mex.spec == undefined || mex.spec == null) {
			return false
		}
		return true
	}

	return {
		setKeyParser: (fn) => {
			keyFromMex = fn
		},
		setValidationFunction: (fn) => {
			validateMex = fn
		},

		on: async (fn) => {
			return await Task()
			.withLocalKVStorage()
			.fromKafka(source)
			.setLocalKV('kafka-mex', x => x)
			.fn(async (x) => {
				return await fn(x.value)
			})
			.filter(x => sourceOptions.autoCommit == false)
			.getLocalKV('kafka-mex')
			.kafkaCommit(source)
			.close()
		},
		emit: async (mex) => {
			const res = validateMex(mex)
			if (res == false) {
				throw 'Messagge format invalid'
			}
			return await Task()
			.toKafka(sink, topic, null, sinkOptions)
			.inject({key: keyFromMex(mex), value: JSON.stringify(mex)})		
		}
	}
}