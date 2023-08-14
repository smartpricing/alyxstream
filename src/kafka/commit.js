'use strict'

import Log from '../logger/default.js'

/** Commit kafka offset 
 *  @params {kafkaConsumer<kafkaConsumer>, value<object>} 
 *  
 */
export default function (kafkaConsumer, value) {
	const newOffset = (parseInt(value.offset) + 1).toString()
	kafkaConsumer.commitOffsets([
	  { topic: value.topic, partition: value.partition, offset: newOffset }
	])
	Log('debug', ['Commit kafka offset', value.topic, value.partition, newOffset ])
}