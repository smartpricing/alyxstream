import * as AS from "../index";
import { Message } from "kafkajs";
import { AckPolicy, DeliverPolicy, ReplayPolicy } from "nats"

const s1 = AS.MakeStorage(AS.StorageKind.Memory, null, "s1");
// const s1 = AS.MakeStorage(AS.StorageKind.Cassandra, null, "s1");
// const s1 = AS.MakeStorage(AS.StorageKind.Postgres, null, "s1");
// const s1 = AS.MakeStorage(AS.StorageKind.Redis, null, "s1");
// const s1 = AS.MakeStorage(AS.StorageKind.Etcd, null, "s1");
// const s1 = AS.MakeStorage(AS.StorageKind.Opensearch, null, "s1");


(async function () {
	const t = AS.Task<string>()
		.tokenize()
		.print(1)
		.each()
		.print(2)
		.fn(x => x.length)
		.print(4)
		.fn(x => [x, 1, 2, 3, 4, "abcd"])
		.print(4)
		.map(x => x.toString())
		.print(5)
		.filterArray(x => x.length < 2)
		.print(6)
		.flat()
		.print(7)
		.reduce(x => parseInt(x))
		.print(8)
		.fn(x => [x, 1, 2, 2, 3, 4, "abcd"])
		.print(9)
		.countInArray(x => x)
		.print(10)
		.fn(x => Object.values(x))
		.print(11)
		.flat()
		.print(12)
		.withLocalKVStorage<number>()
		.setLocalKV("k1", x => x[0] + 10)
		.print(13)
		.getLocalKV("k1")
		.print(14)
		.setLocalKVRaw("k2", r => parseInt(r.key as string))
		.flushLocalKV("k1")
		.getLocalKV("k1")
		.print(15)
		.fn(_ => 100)
		.print(16)
		.getLocalKV("k2")
		.print(17)
		.fn(x => ({ prop: x }))
		.mergeLocalKV("k2")
		.print(18)
		.withStorage(s1)
		.toStorage(_ => "sk1", x => "bla")
		.fn(async _ => []) // check promise infer
		.fnRaw(async _ => [])//from storage pushes in array
		.fromStorage(_ => ["sk1"])
		.fn(x => { console.log(19, x); return x })
		.fromStorageToGlobalState(_ => ["sk1"])
		.fnRaw(x => { console.log(20, x); return x })
		.toStorageList(_ => "skl1", x => x, 100)
		.fromStorageList(_ => ["skl1"], x => [])
		.fn(x => { console.log(21, x); return x })
		.flushStorage(x => ["skl1"])
		.fromStorageList(_ => ["skl1"], x => [])
		.print(22)
		.disconnectStorage()
		.fn(x => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		.groupBy(x => x % 2 === 0 
			? "even"
			: "odd"
		)
		.print(23)
		.objectGroupBy(x => "1")
		.fn(x => { console.log(24, x); return x })
		.fn(x => Object.values(x))
		.map(x => x[1])
		.flat()

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
		.fromString("adkasjfdn")
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

	const kc = AS.KafkaClient({
		brokers: ["localhost:9092"],
		clientId: "test-alyxstream-types",
	})

	const nc = await AS.NatsClient({
		servers: "localhost:4222",
	})

		; (await nc.jetstream().jetstreamManager()).streams.add({
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
		groupId: "test-alyxstream-types-source",
		topics: [{
			topic: "alyxstream-test-topic"
		}]
	})

	const ksink = await AS.KafkaSink(kc, {
		allowAutoTopicCreation: true,
	})

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
		.kafkaCommit(ksource)
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
		.print()
		.fn(_ => setTimeout(() => { process.exit(0) }, 1000))
		.close()
})()
