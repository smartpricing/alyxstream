# Alyxstream

Alyxstream is a library that simplify stream processing in Node.js. We use it in production to make real time logs analysis, errors detection, parallel job processing, using mainly Kafka as source and Cassandra and Redis as sinks. Although it's not perfect and still under active development, this library could help you to solve a lot of processing problems, with a nice dataflow syntax.

Out-of-the-box sources/sinks:

- Kafka
- Redis
- Cassandra
- Nats Jetstream
- Etcd

Working usage examples are in the *usage-examples* folder.

## Table of contents

1. [Introduction](#introduction)
2. [Stream/Batch sources](#sources)
3. [Operators](#operators)
4. [Custom functions](#custom)
5. [Window processing](#windows)
6. [Kafka source and sink](#kafka)
7. [Redis queues](#redisqueue)
8. [Storage](#storage)
9. [Extend the library](#extend)
10. [Kafka Exchange Mode](#exchange)
11. [Multiprocess/Parallel Mode](#parallel)
12. [Nats JetStream](#jetstream)
13. [Distributed locks](#locks)

## Introduction <a name="introduction"></a>

Install it:

```sh
npm install @dev.smartpricing/alyxstream
```

```js
import { 
	Task, 
	MakeStorage, 
	StorageKind, 
	KafkaClient, 
	KafkaSource 
} from '@dev.smartpricing/alyxstream'

const kafkaSource = KafkaSource(KafkaClient())

await Task()
.withLocalKVStorage()
.withStorage(MakeStorage(StorageKind.Cassandra, null, 'hotel.errors.count'))
.fromKafka(kafkaSource)
.setLocalKV('kafka-mex', x => x)
.withEventTime(x => x.eventTime)
.keyBy(x => x.partition)
.map(x => x.value)
.filter(x => x.warningLevel == 'error')
.slidingWindowTime(MakeStorage(StorageKind.Redis, null, 'my.window'), 5 * 60 * 1000, 60 * 1000)
.groupBy(x => x.hotelName)
.sumMap()
.toStorage(x => 'result', x => x)
.getLocalKV('kafka-mex')
.kafkaCommit(kafkaSource)
.close()
```

## Stream/batch sources  <a name="sources"></a>

Alyxstream supports multiple sources by default, both for streaming and batch processing. It'also very easy to build your custom sources.

Always import Task, and Kafka Client/Source if you need Kafka support.


```js
import { 
	Task, 	
	KafkaClient, 
	KafkaSource
} from '@dev.smartpricing/alyxstream'
```

*For every Task, remember to call the **close** method at the end of the task pipeline. The close method signal the Task that it can start to process the data stream*

Array source, the downstream pipeline is called for every element of the array:

```js
await Task().fromArray([1,2,3]).close()
```

Object source, the downstream pipeline is called once:

```js
await Task().fromObject([1,2,3]).close()
await Task().fromObject({name: 'alice'}).close()
```

String source:

```js
await Task().fromString('Alice').close()
```

From readable stream:

```js
await Task().fromReadableStream('/path/to/file.csv').close()
// With integrated unzip
await Task().fromReadableStream('/path/to/file.csv.gz', true).close()
```

From Kafka [The Kafka client/source/sink it's exaplained well below]

```js
const kafkaSource = await KafkaSource(KafkaClient({
	clientId: 'clientId'
}), {
	groupId: 'groupId',
	topics: ['mytopic']
})
await Task().fromKafka(kafkaSource).close()
```

You can also define a Task without a source, and then inject the payload

*For the inject source, the **close** function it's not needed*

```js
const task = await Task().print('>')

for (var i = 0; i < 10; i += 1) {
	await task.inject(i)
}
```

To get back the last result of a Task, use the finalize method:

```js
const t = await Task().fromString('Alice').close()

const result = await t.finalize()
```

## Operators <a name="operators"></a>

### Base operators

Alyxstream support keyed stream processing. In case you don't need it, you can set the key to *default* with the *withDefaultKey()* operator.

```js
await Task().withDefaultKey()
```

Instead if you need a keyed processing (like in windows), you have to set it with the *keyBy* operator,
usually after the source operator. 

```js
await Task().keyBy(x => x.myKey)
await Task().keyBy(x => 'customKey')
```

If you want to use event time based processing, you have to specify it, usually after the source operator.
If not specified, processing time is used.

```js
await Task().withEventTime(x => new Date(x.originalDate))
```

You can stop the pipeline execution for a message that is not conforming with your needs:  

```js
await Task().filter(x => x % 2 == 0)
```
And in every pipeline step, you can print the current operator state:

```js
await Task().print('1 >')
```

### Branch operator

The brach operator helps you to build DAG flow processing (the syntax will be improved):

```js
await Task()
.fromArray([1,2,3])
.branch([
	async () => { return await Task().print('1 >') },
	async () => { return await Task().print('2 >') }
])
.close()
```

### Array operators

Array operators help you to transform array data:

*map* take an input array and apply the map function to every element:

```js
await Task()
.fromObject([1,2,3])
.map(x => x * 2)
.print() // [2,4,6] 
.close()
```

*each* will call the downstream pipeline steps for every array argument (the same of *fromArray* source operator)

```js
await Task()
.fromObject([1,2,3])
.each()
.print() 
.close()
// 1
// 2
// 3
```

*groupBy* take an array, and returns an object.

```js
await Task()
.fromObject([ {name: 'Alice'}, {name: 'Andrea'}, {name: 'Paolo'}, {name: 'Alice'} ])
.groupBy(x => x.name)
.print() 
.close()
// {
// 	Alice: [{name: 'Alice'}, {name: 'Alice'}],
// 	Paolo: [{name: 'Paolo'}],
// 	Andrea: [{name: 'Andrea'}]
// }
```

### Object operators

*sumMap* take an object and count the array elements for every key.

```js
await Task()
.fromObject([ {name: 'Alice'}, {name: 'Andrea'}, {name: 'Paolo'}, {name: 'Alice'} ])
.groupBy(x => x.name)
.sumMap()
.print() 
.close()
// {
// 	Alice: 2,
// 	Paolo: 1,
// 	Andrea: 1
// }
```

### Aggregate

```js
const storage = MakeStorage(StorageKind.Memory, null, 'example')

const t = await Task()
.fromArray(['hello', 'hello', 'alice'])
.aggregate(storage, 'ex', x => x)
.sumMap()
.print('> step result:')
```

## Custom functions <a name="custom"></a>

You can of course use any JS custom made function to process your data. You have to wrap your code inside a function (or an async function)

With synchronous functions:

```js
await Task()
.fromArray([1,2,3])
.fn(x => {
	// x will be 1, then 2, then 3 
	return x * 2
})
.close()
```

or asynchronous:

```js
await Task()
.fromArray([1,2,3])
.fn(async x => {
	return await asyncFunctionYouHaveToCall(x)
})
.close()
```

The **x** callback variable is the data flowing in the pipeline (your payload).

Alyxstream wraps your payload inside an internal datastructure, that is an object:

```js
Message = {
	payload: 'YOUR_PAYLOAD',
	metadata: {}, // Where keyBy, eventTime metadata are keept in memory,
	globalState: {} // Here you can place state that must persist within steps
}
```

In case you need to access the raw message with your custom functions, uses the *fnRaw* variant:

```js
await Task()
.fromArray([1,2,3])
.fnRaw(x => {
	// x = {payload: 1, metadata: {}, globalState: {}}
	x.payload *= 2
	return x
})
.close()
```

## Window processing <a name="windows"></a>

Alyxstream has five kind of windows:

- tumblingWindowCount: (Storage, WindowElementsLength, MaxInactivityMilliseconds [optional])
- tumblingWindowTime: (Storage, WindowTimeMsLength, MaxInactivityMilliseconds [optional])
- slidingWindowCount: (Storage, WindowElementsLength, SlideLength, MaxInactivityMilliseconds [optional])
- slidingWindowTime: (Storage, WindowTimeMsLength, SlideMs, MaxInactivityMilliseconds [optional])
- sessionWindowTime: (Storage, MaxInactivityMilliseconds)

Window's state storage can be in memory or inside Redis (or Redis compatible DB like KVRocks) instance. Every window has an *inactivity* time period, to emit the window result even if no events can trigger it.

In time based windows, there is a watermark concept, so when using event time processing, later records are not allowed (a grace period will be implemented soon).

Windows split stream based on the key you have defined (*keyBy* operator).
They flush the storage every time a window is ready to be emitted.

Base config:

```js
import { 
	Task, 
	MakeStorage, 
	StorageKind
} from '@dev.smartpricing/alyxstream'

const redisConfig = {} // default to localhost:6379
const exampleWindowStorage = MakeStorage(StorageKind.Redis, redisConfig, 'windowStorageId')
```

*tumblingWindowCount*, with 100 elements length and 10 seconds max inactivity time:

```js
await Task()
.fromKafka(...)
.tumblingWindowCount(exampleWindowStorage, 100, 10000)
.close()
```

*tumblingWindowTime*, 1 minute length and 10 seconds max inactivity time:

```js
await Task()
.fromKafka(...)
.tumblingWindowTime(exampleWindowStorage, 60000, 10000)
.close()
```

*slidingWindowCount*, with 100 elements length, 25 elements slide, and 10 seconds max inactivity time:

```js
await Task()
.fromKafka(...)
.slidingWindowCount(exampleWindowStorage, 100, 25, 10000)
.close()
```

*slidingWindowTime*, 1 minute length, 5 seconds slide, and 10 seconds max inactivity time:

```js
await Task()
.fromKafka(...)
.slidingWindowTime(exampleWindowStorage, 60000, 5000, 10000)
.close()
```

*sessionWindowTime*, max 15 seconds inactivity

```js
await Task()
.fromKafka(...)
.sessionWindowTime(exampleWindowStorage, 150000)
.close()
```

## Kafka source and sink <a name="kafka"></a>

KafkaClient:

```js
import { 
	KafkaClient
} from '@dev.smartpricing/alyxstream'

const kafkaClient = KafkaClient({
	clientId: 'my-client'
	brokers: ['localhost:9092'], 
  	ssl: false,
  	sasl: ({ // for Confluent access
  	    mechanism: 'plain',
  	    username: 'username',
  	    password: 'password'
  	})	
})
```

KafkaSource:

```js
import { 
	KafkaSource
} from '@dev.smartpricing/alyxstream'

const topic = {
	topic: 'my-topic',
	fromBeginning: false,
	autoCommit: false,
	autoHeartbeat: 5000
}

const kafkaSource = KafkaSource(kafkaClient, {
	groupId: 'my-group-id',
	topics: [topic]	
})
```

## Redis queue <a name="redisqueue"></a>

Redis queue use Redis list with BRPOP command in order to distrubute jobs between workers:

```js
import { Task, MakeStorage, StorageKind } from '@dev.smartpricing/alyxstream'

const queueStorage = MakeStorage(StorageKind.Redis, null, 'my-queue')

async function producer () {
	const t = await Task()
	.fromReadableStream('data.csv.gz', true)
	.readline()
	.tumblingWindowCount(MakeStorage(StorageKind.Memory, null, 'my-queue-win'), 10)
	.enqueue(queueStorage)
	.fn(async (x) => {
		while (true) {
			const queueSize = await queueStorage.queueSize()	
			if (queueSize > 100) {
				await new Promise(resolve => setTimeout(resolve, 1000))
			} else {
				break
			}
		}
	})
	.close()
}

async function consumer () {
	const t = await Task()
	.dequeue(queueStorage)
	.fn(async x => {
		console.log(x)
		return x
	})
	.close()
} 

async function run () {
	if (process.env.RUN == 'producer') {
		await producer()	
	} else {
		await consumer()
	}
}

run()
```

## Storage <a name="storage"></a>

Alyxstream supports out of the box three kind of storage: memory, Redis and Cassandra.
Memory and Redis storage are suitable for windows state storage.

```js
import { MakeStorage, StorageKind } from '@dev.smartpricing/alyxstream'

const memStorage = MakeStorage(StorageKind.Memory, null, 'storage-1')

const redisStorage = MakeStorage(StorageKind.Redis, null, 'storage-1')

const cassandraStorage = MakeStorage(StorageKind.Cassandra, null, 'storage-1')
```

Accessing raw client:

```js

const redisStorage = MakeStorage(StorageKind.Redis, null, 'storage-1')
const redisStorageClient = redisStorage.db() // io-redis


const cassandraStorage = MakeStorage(StorageKind.Cassandra, null, 'storage-1')
const cassandraStorageClient = cassandraStorage.db() // cassandra-driver
```

### Internal KV storage


```js
import { Task } from '@dev.smartpricing/alyxstream'

await Task()
.withLocalKVStorage()
.setLocalKV('my-var', x => x * 2)
.getLocalKV('my-var')
.mergeLocalKV('my-var')
```

## Extend the library <a name="extend"></a>

You can create your custom functions and call the functions from a task:

```js
import { Task, ExtendTask, ExtendTaskRaw } from '@dev.smartpricing/alyxstream'

export const multiplyBy = ExtendTask('multiplyBy', async function (x, multiplier) {
    return x * multiplier
})

export const multiplyByRaw = ExtendTaskRaw('multiplyByRaw', async function (x, multiplier) {
    return x.payload * multiplier
})

await Task()
.multiplyBy(2)
.multiplyByRaw(2)
.inject(3) // output 12
```

## Kafka Exchange Mode <a name="exchange"></a>

Alyxstream contains a wrapper around itself in order to simplify a special use case of Kafka communication between microservices. It's called Exchange and allow bidirectional communication between two (or more) services.

```js
import { 
	Exchange,
	KafkaClient
} from '@dev.smartpricing/alyxstream'

const client = KafkaClient({
	clientId: 'my-client-1',
	brokers: ['localhost:9092'], 		
})

let mex = {
	kind: 'TestObject',
	metadata: {
		key: '1'
	},
	spec: {
		value: 1
	}
}

/** Exchange(KafkaClient, topicName, groupId, sourceoptions as kafka js options) */
const ex1 = await Exchange(client, 'alyxstream-exchange-01', 'ae-01', {autoCommit: false})
const ex2 = await Exchange(client, 'alyxstream-exchange-02', 'ae-02', {autoCommit: false})

await ex1.emit(mex)
await ex1.on(async (messagge) => {
	console.log('sub', messagge)
	messagge.spec.value += 1
	await ex2.emit(messagge)
})
```

In order to override the default key parser and messagge validator:

```js
const ex1 = await Exchange(client, 'alyxstream-exchange-01', 'ae-01', {autoCommit: false})
ex1.setKeyParser(x => x.metadata.myKey)
ex1.setValidationFunction(x => {
	if (x.spec.myValue == undefined) {
		return false
	}
	return true
})
```

## Multiprocess/Parallel Mode <a name="parallel"></a>

You can process a stream of data using multiple Node.js process:

```js
import { Task } from '@dev.smartpricing/alyxstream'

await Task()
.parallel(3)
.dequeue(STORAGE)
.close()
```

## NATS JetStream [ALPHA] <a name="jetstream"></a>

Producer:

```js
import { Task, NatsClient } from '@dev.smartpricing/alyxstream';

const nc = await NatsClient()

const t = await Task()
.toNats(nc, 'sp-test.a.a')

for (var i = 0; i < 100; i += 1) {
  await t.inject({key: i})
}

```

Consumer:
```js
import { Task, NatsClient, NatsJetstreamSource } from '@dev.smartpricing/alyxstream';

const nc = await NatsClient()
const source = await NatsJetstreamSource(nc, [{
  stream: 'sp-test',
  durable_name: 'worker-4',
  ack_policy: 'Explicit',
  filter_subjects: ['sp-test.a.a', 'sp-test.a.b']
}])

await Task()
.fromNats(source)
.print('>')
.close()
```

## Distributed locks [ALPHA] <a name="locks"></a>

Using Smartlocks libs, we can acquire global locks and have atomic counters.

Lock/Release:

```js
import { Mutex, StorageKind as MSKind } from 'smartlocks'
const lockStorage = Mutex(MSKind.Cassandra, null)

await Task()
.parallel(5)
.fromArray([{i: 1}, {i: 2}, {i: 3}])
.fn(x => {
  x.i = x.i * 2
  return x
})
.lock(lockStorage, x => 'my-lock')
.fn(x => {
  console.log(x)
})
.release(lockStorage, x => 'my-lock')
.close()
```
