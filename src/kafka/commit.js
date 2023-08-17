'use strict'

import Log from '../logger/default.js'

function _kafkaCommit (kafkaConsumer, value) {
	const newOffset = (parseInt(value.offset) + 1).toString()
	kafkaConsumer.commitOffsets([
	  { topic: value.topic, partition: value.partition, offset: newOffset }
	])
	Log('debug', ['Commit kafka offset', value.topic, value.partition, newOffset ])
}

/** Commit kafka offset 
 *  @params {kafkaConsumer<kafkaConsumer>, value<object>} 
 *  
 */

export default async function KafkaCommit (x, kafkaSource) {
	const partition = x.partition
	const offset = x.offset
	const topic = x.topic
	Interface.LogStandard('Committed', topic, partition, offset)
	_kafkaCommit(kafkaSource.consumer(), {
		topic: topic,
		partition: partition,
		offset: offset
	})	
    return x
}