import { AckPolicy, DeliverPolicy, ReplayPolicy } from "nats"
import { randomUUID } from "crypto"
import { Message } from "kafkajs";
import * as AS from "../index";

/**
 * 
 * requires Kafka, Nats, Etcd 
 * 
 * */

// let s1 = AS.MakeStorage(AS.StorageKind.Cassandra, null, "s1");
// let s1 = AS.MakeStorage(AS.StorageKind.Postgres, null, "s1");
// let s1 = AS.MakeStorage(AS.StorageKind.Redis, null, "s1");
// let s1 = AS.MakeStorage(AS.StorageKind.Opensearch, null, "s1");
let s1 = AS.MakeStorage(AS.StorageKind.Memory, null, "s1");

let etcdStorage = AS.MakeStorage(AS.StorageKind.Etcd, {
	hosts: ["localhost:2379"],	
}, "s1");

(async function () {
	var done = false
	setTimeout(() => {
		if (done) process.exit(0)
		else process.exit(1)
	}, 100_000)

	const kc = AS.KafkaClient({
		brokers: ["localhost:9092"],
		clientId: "test-alyxstream-types",
	})

	const nc = await AS.NatsClient({
		servers: "localhost:4222",
	})

	const jsm = await nc.jetstream().jetstreamManager()
	await jsm.streams.add({
		name: "alyxstream-test-stream",
		subjects: ["alyxstream.test.>"]
	})

	const nsource = await AS.NatsJetstreamSource(nc, [{
		stream: "alyxstream-test-stream",
		name: "alyxstream-test-source",
		durable_name: "alyxstream-test-source",
		filter_subjects: ["alyxstream.test.>"],
		ack_policy: AckPolicy.None,
		deliver_policy: DeliverPolicy.New,
		replay_policy: ReplayPolicy.Instant,
	}])

	const ksource = await AS.KafkaSource(kc, {
		groupId: randomUUID(),
		topics: [{
			topic: "alyxstream-test-topic"
		}]
	})

	const ksink = await AS.KafkaSink(kc, {
		allowAutoTopicCreation: true,
	})

	const t = AS.Task<string>()
		.tokenize()
		.each()
		.fn(x => x.length)
		.fn(x => [x, 1, 2, 3, 4, "abcd"])
		.map(x => x.toString())
		.filterArray(x => x.length < 2)
		.flat()
		.reduce(x => parseInt(x))
		.fn(x => [x, 1, 2, 2, 3, 4, "abcd"])
		.countInArray(x => x)
		.fn(x => Object.values(x))
		.flat()
		.withLocalKVStorage<number>()
		.setLocalKV("k1", x => x[0] + 10)
		.getLocalKV("k1")
		.setLocalKVRaw("k2", r => parseInt(r.key as string))
		.flushLocalKV("k1")
		.getLocalKV("k1")
		.fn(_ => 100)
		.getLocalKV("k2")
		.fn(x => ({ prop: x }))
		.mergeLocalKV("k2")
		.withStorage(s1)
		.toStorage(_ => "sk1", x => "bla")
		.fn(async _ => []) // check promise infer
		.fnRaw(async _ => [])//from storage pushes in array
		.fromStorage(_ => ["sk1"])
		.fromStorageToGlobalState(_ => ["sk1"])
		.toStorageList(_ => "skl1", x => x, 100)
		.fromStorageList(_ => ["skl1"], x => [])
		.flushStorage(x => ["skl1"])
		.fromStorageList(_ => ["skl1"], x => [])
		.disconnectStorage()
		.fn(x => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		.groupBy(x => x % 2 === 0 
			? "even"
			: "odd"
		)
		.objectGroupBy(x => "1")
		.fn(x => Object.values(x))
		.map(x => x[1])
		.flat()
		.parallel(3, () => console.log("parallel"))
		.fn(x => {
			if (x !== null) {
				throw Error("should be null")
			}
		})

	await t.inject("I like types!")

	await AS.Task()
		.fromArray([1, 2, 3, 4])
		.fn(x => x * 2)
		.close()

	await AS.Task()
		.fromArray([[1, 2, 3, 4]])
		.map(x => x * 2)
		.close()

	AS.Task()
		.fromObject({ a: 1, b: 2, c: { d: 3, e: 4 } })
		.objectGroupBy(x => "1") // won't work (add ObjectOfArrays task??)
	// .close()

	await AS.Task()
		.fromString("abcdabcdabcd")
		.tokenize("a")
		.each()
		.print()
		.close()

	// how does this work?
	// await AS.Task()
	// 	.fromReadableStream("./tests/types.txt")
	// 	.fn(x => x.read())
	// 	.print()
	// 	.close()

	await AS.Task()
		.fromInterval(10, undefined, 3)
		.print("kafka - callback")
		.toKafka(ksink, "alyxstream-test-topic", x => ({
			key: "asd",
			value: JSON.stringify({ x })
		}))
		.close()

	await AS.Task()
		.fromInterval(10, undefined, 3)
		.print("kafka - preparsed")
		.fn<Message>(x => ({ key: "abcd", value: JSON.stringify({ x }) }))
		.toKafka(ksink, "alyxstream-test-topic")
		.close()

	await AS.Task()
		.fromKafka(ksource)
		.slidingWindowTime(s1, 100, 200, 1000)
		.print("kafka - sliding window time")
		.each()
		.filter(x => !!x)
		.print("kafka - consume")
		.kafkaCommit(ksource)
		.fn(_ => done = true)
		.close()

	await AS.Task()
		.fromInterval(10, undefined, 3)
		.toNats(nc, "alyxstream.test.1234", x => ({
			key: "asd",
			value: JSON.stringify({ x }) // cb not called so message is number
		}))
		.close()

	await AS.Task()
		.fromNats<number>(nsource) // number because cb is not called in sink
		.fn(x => x.data)
		.print("nats - consume")
		.slidingWindowCount(s1, 3, 0, 1000)
		.print("nats - sliding window count")
		.map(x => console.log(x))
		.close()

	await AS.Task()
		.fromArray([1, 1, 1, 1])
		.sum()
		.print("SUM")
		.close()

	await AS.Task()
		.fromArray([1, 2, 3, 4])
		.withDefaultKey()
		.joinByKeyWithParallelism(s1, x => x.key!, 2) // this creates an array of metadata
		.print("jkp >")
		.close()

	await AS.Task()
		.fromEtcd(etcdStorage, "default")
		.keyBy(x => x.key.toString())
		.fn(x => x.value.toString())
		.print("etcd - watch")
		.close()

	await AS.Task()
		.fromInterval(10, undefined, 3)
		.withDefaultKey()
		.withStorage(etcdStorage)
		.toStorage(
			x => x.metadata.key, 
			x => x.payload
		)
		.print("etcd - write")
		.close()
})()
