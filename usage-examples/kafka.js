'use strict'

import { 
	Task, 
	MakeStorage,
	StorageKind,
	KafkaSource, 
	KafkaClient, 
	KafkaCommit, 
	KafkaSink 
} from '../index.js'

/**
 * 	In order to run this example, you will need a
 * 	Kafka or Redpanda broker on your local machine.
 */ 


(async () => {
	const topic = 'alyxstream-kafka-example'
	const kafkaClient = KafkaClient({
		brokers: ['localhost:9092']
	})
	const kafkaSource = await KafkaSource(kafkaClient, {
		topics: [{
			topic: topic,
			fromBeginning: true,
			autoCommit: true
		}],
		groupId: 'alyxstream-kafka-example-consumer'
	})
	const kafkaSink = await KafkaSink(kafkaClient)

	/** Consumer **/
	await Task()
	.fromKafka(kafkaSource)
	.keyBy(x => x.partition)
	.tumblingWindowCount(MakeStorage(StorageKind.Memory, null, 'alyxstream-kafka-example-storage'), 10)
	.print('>')
	.close()

	/** Producer **/
	let id = 0
	while (true) {
		await kafkaSink.send({
			topic: topic,
			messages: [
				{ key: id.toString(), value: id.toString() }
			]
		})
		await new Promise(resolve => setTimeout(resolve, 50))
	}
})()