import * as Opensearch from "@opensearch-project/opensearch"
import * as Cassandra from "cassandra-driver";
import * as Smartlocks from "smartlocks"
import * as Pulsar from 'pulsar-client'
import * as Redis from "ioredis";
import * as Kafka from "kafkajs"
import * as Postgres from "pg";
import * as Etcd from "etcd3"
import * as Nats from "nats"
import * as Ws from "ws"
import * as fs from "fs"

/** Alyxstream Task Message.*/
export declare type TaskMessage<T, G> = {
    payload: T
    metadata: TaskMessageMetadata //| TaskMessageMetadata[], // can be an array of metadata because of joinByKeyWithParallelism
    globalState: G,
    [x: string]: any
}

export declare type TaskMessageMetadata = {
    key?: string | number
    windowKey?: string | number | null,
    startTime?: any,
    endTime?: any,
    windowTimeInSeconds?: number | null,
    windowTimeInMinutes?: number | null,
    windowTimeInHours?: number | null,
    windowElements?: any
}

/** Alyxstream Task instance.
 * @I initial message type (needed for the *inject()* function)
 * @C current message type
 * @L local storage value types
 * @Ls is local storage set (default: *false*)
 * @Ms are metadata set (default: *false*)
 * @Sk task storage system kind (default: *null*) */
export declare interface T<I, C, G, L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> {
    /** Initializes task metadata.
     * @enables *setMetadata()*, *getMetadata()*. */
    withMetadata: () => T<I, C, G, L, Ls, Sk, true>

    /** @requires *task.withMetadata()*. */
    setMetadata: Ms extends true
    ? (id: any) => T<I, C, G, L, Ls, Sk, Ms>
    : never

    /** Returns task metadata.
     * @requires *task.withMetadata()*. */
    getMetadata: Ms extends true ? () => {
        id: any,
        [x: string]: any
        [x: number]: any
    }
    : never

    /** Sets the message key to *"default"* */
    withDefaultKey: () => T<I, C, G, L, Ls, Sk, Ms>

    /** Sets the event time from the message payload. */
    withEventTime: (cb: (x: C) => number) => T<I, C, G, L, Ls, Sk, Ms>

    /** Sets the message key from the message payload. */
    keyBy: (cb: (x: C) => string | number) => T<I, C, G, L, Ls, Sk, Ms>

    filter: (cb: (x: C) => boolean) => T<I, C, G, L, Ls, Sk, Ms>

    print: (str?: any) => T<I, C, G, L, Ls, Sk, Ms>

    /** Splits the task execution into multiple subtasks. Waits for subtasks execution and continues to the next operator passing the array of subtasks results as message. */
    branch: <R = any>(subtaskFuncs: ((x: C) => Promise<T<any, R, any, any, any, any>>)[]) => T<I, R[], G, L, Ls, Sk, Ms>

    readline: () => T<I, string, G, L, Ls, Sk, Ms>

    /** Execute a function on the message payload. Can be an async function. */
    fn: <R>(callback: (x: C) => R) => R extends Promise<infer U>
        ? T<I, U, G, L, Ls, Sk, Ms>
        : T<I, R, G, L, Ls, Sk, Ms>

    /** Execute a function on the raw task message. Can be an async fucntion. */
    fnRaw: <R>(callback: (x: TaskMessage<C, G>) => R) => R extends Promise<infer U>
        ? T<I, U, G, L, Ls, Sk, Ms>
        : T<I, R, G, L, Ls, Sk, Ms>

    /** @deprecated use fn() instead */
    customFunction: <R>(callback: (x: C) => R) => T<I, R, G, L, Ls, Sk, Ms>

    /** @deprecated use fn() instead */
    customAsyncFunction: <R>(callback: (x: C) => Promise<R>) => T<I, R, G, L, Ls, Sk, Ms>

    /** @deprecated use fnRaw() instead */
    customFunctionRaw: <R>(callback: (x: TaskMessage<C, G>) => R) => T<I, R, G, L, Ls, Sk, Ms>

    /** @deprecated use fnRaw() instead */
    customAsyncFunctionRaw: <R>(callback: (x: TaskMessage<C, G>) => Promise<R>) => T<I, R, G, L, Ls, Sk, Ms>

    // this creates an array of metadata (may cause type errors)
    joinByKeyWithParallelism: (
        storage: Storage<any>,
        keyFunction: (x: TaskMessage<C, G>) => string | number,
        parallelism: number
    ) => T<I, C[], G, L, Ls, Sk, Ms>

    parallel: <Pf extends () => any>(numberOfProcess: number, produceFunction?: Pf) => T<I, null, G, L, Ls, Sk, Ms>

    queueSize: (storage: Storage<QueueStorageKind>) => T<I, number, G, L, Ls, Sk, Ms> // to check if it's really a number

    enqueue: (storage: Storage<QueueStorageKind>) => T<I, number, G, C, Ls, Sk, Ms>

    dequeue: <R = any>(storage: Storage<QueueStorageKind>) => T<I, R, G, C, Ls, Sk, Ms>

    multiDequeue: <R = any>(storage: Storage<QueueStorageKind>) => T<I, R, G, C, Ls, Sk, Ms>

    /** Sets the task internal storage system.
     * @enables *toStorage()*, *fromStorage()*, *flushStorage()*, *fromStorageToGlobalState()*, *disconnectStorage()*, *collect()*, *storage()*. */
    withStorage: <K extends StorageKind>(storage: Storage<K>) => T<I, C, G, L, Ls, K, Ms>

    /** @requires *task.withStorage()*.*/
    toStorage: Sk extends StorageKind
    ? (keyFunc: (x: TaskMessage<C, G>) => string | number, valueFunc?: (x: TaskMessage<C, G>) => any, ttl?: number) => T<I, C, G, L, Ls, Sk, Ms> /*To check*/
    : never

    /** @requires *task.withStorage()*.*/
    toStorageList: Sk extends StorageKind
    ? (keyFunc: (x: TaskMessage<C, G>) => string | number, valueFunc?: (x: C) => any, ttl?: number) => T<I, C, G, L, Ls, Sk, Ms> /*To check*/
    : never

    /** @requires *task.withStorage()*
     * @requires lists-compatible storage system */
    fromStorageList: Sk extends ListStorageKind
    ? <R = any>(keyFunc: (x: TaskMessage<C, G>) => (string | number)[], valueFunc: (x: C) => R[]) => T<I, R[], G, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withStorage()*. */
    fromStorageToGlobalState: Sk extends StorageKind
    ? (keysFunc: (x: TaskMessage<C, G>) => (string | number)[]) => T<I, C, { [x: string]: any }, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withStorage()*. */
    disconnectStorage: Sk extends StorageKind
    ? () => T<I, C, G, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withStorage()*. */
    flushStorage: Sk extends StorageKind ?
    (keysFunc: (x: TaskMessage<C, G>) => (string | number)[]) => T<I, C, G, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withStorage()*. */
    storage: Sk extends StorageKind
    ? () => Storage<any>
    : never

    /** Sets the task in-memory key-value store.
     * @enables *setLocalKV()*, *setLocalKVRaw()*, *getLocalKV*(), *mergeLocalKV()*, *flushLocalKV().* */
    withLocalKVStorage: <newL = any>() => T<I, C, G, newL, true, Sk, Ms> // define the type of items stored in storage keys

    /** @requires *task.withLocalKVStorage()*. */
    setLocalKV: Ls extends true
    ? (key: string | number, func: (x: C) => L) => T<I, C, G, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withLocalKVStorage()*. */
    setLocalKVRaw: Ls extends true
    ? (key: string | number, func: (x: TaskMessage<C, G>) => L) => T<I, C, G, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withLocalKVStorage()*. */
    getLocalKV: Ls extends true
    ? <K>(key?: K) => K extends Exclude<K, string | number> // check if key is provided
        ? T<I, { [x in string | number]: L }, G, L, Ls, Sk, Ms> // not provided => returns full storage
        : T<I, L, G, L, Ls, Sk, Ms> // provided => returns single storage value
    : never

    /** @requires *task.withLocalKVStorage()*. */
    flushLocalKV: Ls extends true
    ? (key: string | number) => T<I, C, G, L, Ls, Sk, Ms>
    : never

    /** @requires windowing-compatible storage system */
    tumblingWindowCount: (storage: Storage<WindowStorageKind>, countLength: number, inactivityMilliseconds: number) => T<I, C[], G, L, Ls, Sk, Ms>

    /** @requires windowing-compatible storage system */
    tumblingWindowTime: (storage: Storage<WindowStorageKind>, timeLengthMilliSeconds: number, inactivityMilliseconds?: number) => T<I, C[], G, L, Ls, Sk, Ms>

    /** @requires windowing-compatible storage system */
    sessionWindowTime: (storage: Storage<WindowStorageKind>, inactivityMilliseconds: number) => T<I, C[], G, L, Ls, Sk, Ms>

    /** @requires windowing-compatible storage system */
    slidingWindowCount: (storage: Storage<WindowStorageKind>, countLength: number, slidingLength: number, inactivityMilliseconds: number) => T<I, C[], G, L, Ls, Sk, Ms>

    /** @requires windowing-compatible storage system */
    slidingWindowTime: (storage: Storage<WindowStorageKind>, timeLengthMilliSeconds: number, slidingLengthMilliseconds: number, inactivityMilliseconds: number) => T<I, C[], G, L, Ls, Sk, Ms>

    /** Procudes task messages iterating over the provided array. */
    fromArray: <R>(array: R[]) => T<I, R, G, L, Ls, Sk, Ms>

    /** Procudes a single task message from the provided object. */
    fromObject: <R>(object: R) => T<I, R, G, L, Ls, Sk, Ms>

    /** Procudes a single task message from the provided string. */
    fromString: (string: string) => T<I, string, G, L, Ls, Sk, Ms>

    /** Procudes task messages iterating by ticking at the provided time interval. */
    fromInterval: <R = number>(intervalMs: number, generatorFunc?: (counter: number) => R, maxSize?: number) => T<I, R, G, L, Ls, Sk, Ms>/*TBD*/

    fromReadableStream: (filePath: fs.PathLike, useZlib?: boolean) => T<I, fs.ReadStream, G, L, Ls, Sk, Ms>

    /** Produces a message to a Kafka topic. */
    toKafka: C extends (Kafka.Message | Kafka.Message[])
    ? (kafkaSink: KSink, topic: string, callback?: (x: C) => Kafka.Message | Kafka.Message[], options?: KSinkOptions) => T<I, C, G, L, Ls, Sk, Ms>
    : (kafkaSink: KSink, topic: string, callback: (x: C) => Kafka.Message | Kafka.Message[], options?: KSinkOptions) => T<I, C, G, L, Ls, Sk, Ms>

    /** Consume messages from a Kafka source. */
    fromKafka: <R = any>(source: KSource) => T<I, KMessage<R>, G, L, Ls, Sk, Ms>

    kafkaCommit: C extends KCommitParams
    ? (kafkaSource: KSource, commitParams?: KCommitParams) => T<I, C, G, L, Ls, Sk, Ms>
    : (kafkaSource: KSource, commitParams: KCommitParams) => T<I, C, G, L, Ls, Sk, Ms>

    fromPulsar: (source: PlsSource) => T<I, Pulsar.Message, G, L, Ls, Sk, Ms>

    toPulsar: (sink: PlsSink, keyCb: (x: C) => any /*TBD*/, dataCb: (x: C) => any) => T<I, C, G, L, Ls, Sk, Ms>

    flushPulsar: (sink: PlsSink) => T<I, C, G, L, Ls, Sk, Ms>,

    toPulsarWs: (sink: PlsWsSink, keyCb: (x: C) => any /*TBD*/, dataCb: (x: C) => any) => T<I, C, G, L, Ls, Sk, Ms>,

    parsePulsar: <R = any>(parseWith?: (x: string) => R) => T<I, R, G, L, Ls, Sk, Ms>,

    ackPulsar: (sink: PlsSource) => T<I, C, G, L, Ls, Sk, Ms>,

    /** Watch changes over an Etcd key. */
    fromEtcd: (storage: Storage<StorageKind.Etcd>, key: string | number, watch?: boolean) => T<I, Etcd.IKeyValue, G, L, Ls, Sk, Ms>,

    /** Consumes messages from a NATS Jetstream stream */
    fromNats: <R = any>(source: NatsJsSource) => T<I, NatsStreamMsg<R>, G, L, Ls, Sk, Ms>,

    // dataCb is not called in this sink
    /** Produces a message to a NATS Jetstream stream. */
    toNats: (sink: Nats.NatsConnection, topic: string, dataCb?: (x: C) => any) => T<I, C, G, L, Ls, Sk, Ms>,

    /** Acquires a lock on a storage key using a smartlocks library mutex. */
    lock: (mutex: Smartlocks.Mutex, lockKeyFn: (x: C) => string | number, retryTimeMs?: number, ttl?: number) => T<I, C, G, L, Ls, Sk, Ms>,

    /** Releases a lock on a storage key using a smartlocks library mutex. */
    release: (mutex: Smartlocks.Mutex, lockKeyFn: (x: C) => string | number) => T<I, C, G, L, Ls, Sk, Ms>,

    /** Progressively sums messages, returning the current counter value.
     * @requires *number* */
    sum: C extends number
    ? () => T<I, number, G, L, Ls, Sk, Ms>
    : never

    /** Push a new message to the task. */
    inject: (data: I) => Promise<T<I, C, G, L, Ls, Sk, Ms>>

    /** Starts the task execution when using a source. */
    close: () => Promise<T<I, C, G, L, Ls, Sk, Ms>>

    /** Return the last result of the task. */
    finalize: <R = C>() => TaskMessage<R, G>

    self: (cb: (task: T<I, C, G, L, Ls, Sk, Ms>) => any) => T<I, C, G, L, Ls, Sk, Ms>

    /** @requires *task.withStorage()*
     * @requires collect-compatible storage system */
    collect: Sk extends CollectStorageKind
    ? <R = any>(
        idFunction: (x: TaskMessage<C, G>) => string,
        keyFunction: (x: TaskMessage<C, G>) => string,
        valueFunction: (x: TaskMessage<C, G>) => R | null,
        waitUntil: (arr: any[], flat: any[]) => boolean, /* TBD */
        emitFunction: (arr: any[], flat: any[]) => boolean, /* TBD */
        ttl?: number,
    ) => T<I, C, G, L, Ls, Sk, Ms>
    : never,

    sumMap: () => T<I, { [x in keyof C]: number }, G, L, Ls, Sk, Ms>

    /** Executes a groupBy for every key of the object message. */
    objectGroupBy: (keyFunction: (x: C) => string | number) => T<I, { [x in string | number]: C[] }, G, L, Ls, Sk, Ms>

    /** Aggregates array element by key in a storage system. */
    aggregate: <R = C>(storage: Storage<any>, name: string, keyFunction: (x: C) => string | number) => T<I, { [x in string | number]: R[] }, G, L, Ls, Sk, Ms>

    /** @requires *task.withLocalKVStorage().* */
    mergeLocalKV: Ls extends true
    ? <K extends string | number>(key: K) => T<I, C & { [x in K]: L }, G, L, Ls, Sk, Ms>
    : never

    /** Transform array
    * @requires *array* */
    map: C extends (infer U)[]
    ? <R>(func: (x: U) => R) => T<I, R[], G, L, Ls, Sk, Ms>
    : never

    /** Splits the task execution for each element of the array.
     * @requires *array* */
    each: C extends (infer U)[]
    ? (func?: (x: U) => any) => T<I, U, G, L, Ls, Sk, Ms>
    : never

    /** Filters array elements.
     *  @requires *array* */
    filterArray: C extends (infer U)[]
    ? (func: (x: U) => boolean) => T<I, C, G, L, Ls, Sk, Ms>
    : never

    // why does this implement a number only internal reduce function? (sum)
    // reduce: <R>(func: (prev: ElemOfArr<T>, curr: ElemOfArr<T>, currIdx?: number) => R, initialValue?: R) => Tsk<I, R, L, Ls, Ss, Ms>
    /** @requires *array* */
    reduce: C extends (infer U)[]
    ? (func?: (x: U) => number) => T<I, number, G, L, Ls, Sk, Ms>
    : never

    /** Count array element by key.
     * @requires *array* */
    countInArray: C extends (infer U)[]
    ? (func: (x: U) => string | number) => T<I, { [x in string | number]: number }, G, L, Ls, Sk, Ms>
    : never

    /** Returns the array length.
     * @requires *array* */
    length: C extends any[]
    ? () => T<I, number, G, L, Ls, Sk, Ms>
    : never

    /** @requires *array* */
    groupBy: C extends (infer U)[]
    ? (func: (elem: U, index?: number, array?: U[]) => any) => T<I, { [x in string | number]: U[] }, G, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withStorage()*
     * @requires *array* */
    fromStorage: Sk extends null
    ? never
    : C extends any[]
    ? (keysFunc: (x: TaskMessage<C, G>) => (string | number)[]) => T<I, unknown[], G, L, Ls, Sk, Ms>
    : never

    /** Flattens an array.
     * @requires *array* */
    flat: C extends any[]
    ? () => T<I, NestedElem<C>[], G, L, Ls, Sk, Ms>
    : never

    /** Splits a string (default separator: '\s').
     * @requires *string* */
    tokenize: C extends string
    ? (separator?: string) => T<I, string[], G, L, Ls, Sk, Ms>
    : never

    // prevents type errors for task extensions
    // [x: string]: any
}

export declare type TaskExtension<T, U extends any[]> = (first: T, ...rest: U) => void;

/** Intialize an Alyxstream task. Generic type can be used to provide the initial *inject()* message type. */
export declare function Task<I = any>(id?: any): T<I, I, any, void, false, null, false> /*TBD*/

/** Extends a task by creating a custom method. This function is **type unsafe**. Consider using **fn()** with a custom callback for type safety. */
export declare function ExtendTask(name: string, extension: TaskExtension<any, any>): void

/** Extends a task by creating a custom method that operates on the raw task message. This function is **type unsafe**. Consider using **fnRaw()** with a custom callback for type safety. */
export declare function ExtendTaskRaw(name: string, extension: TaskExtension<TaskMessage<any, any>, any>): void

export declare enum StorageKind {
    Memory = "Memory",
    Redis = "Redis",
    Cassandra = "Cassandra",
    Etcd = "Etcd",
    Opensearch = "Opensearch",
    Postgres = "Postgres"
}

// from IOptions.node
export declare type OpensearchNode =
    string |
    string[] |
    Opensearch.NodeOptions |
    Opensearch.NodeOptions[]

/** Conditional generic type for different storage configuration objects. */
export declare type StorageConfig<K extends StorageKind> = K extends StorageKind.Memory
    ? null // memory storage has no config obj
    : K extends StorageKind.Redis
    ? Redis.RedisOptions
    : K extends StorageKind.Cassandra
    ? Cassandra.ClientOptions
    : K extends StorageKind.Etcd
    ? Etcd.IOptions
    : K extends StorageKind.Opensearch
    ? OpensearchNode
    : K extends StorageKind.Postgres
    ? Postgres.ClientConfig
    : never

/** Storage sytem to be used in Alyxstream tasks. */
export declare interface Storage<K extends StorageKind> {
    db: () => StorageEngine<K>
    set: (key: string, value: any, ttl?: number | null) => Promise<void>; /*TBD*/
    get: (key: string) => Promise<any>; /*TBD*/
    push: (key: string, value: any) => Promise<void>; /*TBD*/
    flush: (key: string) => Promise<void>; /*TBD*/
    getList: K extends ListStorageKind ? (key: string) => Promise<any[]> : never; /*TBD*/
    slice: K extends WindowStorageKind ? (key: string, numberOfItemsToRemove: number) => Promise<void> : never, /*TBD*/
    sliceByTime: K extends WindowStorageKind ? (key: string, startTime: number) => Promise<void> : never, /*TBD*/
    disconnect: K extends WindowStorageKind ? () => Promise<void> : never, /*TBD*/
    flushStorage: K extends WindowStorageKind ? () => Promise<void> : never, /*TBD*/
    queueSize: K extends QueueStorageKind ? (data?: any) => Promise<number> : never,
    enqueue: K extends QueueStorageKind ? (data: any) => Promise<number> : never,
    dequeue: K extends QueueStorageKind ? <R = any>() => Promise<R> : never
}

type StorageEngine<K extends StorageKind> =
    K extends StorageKind.Memory
    ? any // internal state
    : K extends StorageKind.Redis
    ? Redis.Redis
    : K extends StorageKind.Cassandra
    ? Cassandra.Client
    : K extends StorageKind.Etcd
    ? Etcd.Etcd3
    : K extends StorageKind.Opensearch
    ? Opensearch.Client
    : K extends StorageKind.Postgres
    ? Postgres.Client
    : never

/** Initialize an Alyxstream storage system to be used in a task. */
export declare function MakeStorage<K extends StorageKind>(kind: K, config?: StorageConfig<K> | null, id?: string | number): Storage<K>

/** Initialize an HTTP server that exposes the state of a set of Alyxstream storage systems. Endpoint: /api/v1/state/:prefix/:keys. */
export declare function ExposeStorageState(storageMap: { [x in string | number]: Storage<any> }, config?: { port?: number }): void

export declare interface KMessage<T> {
    topic: string,
    offset: string,
    partition: number,
    headers: any, /*TBD*/
    key: string,
    value: T
}

export declare type KSinkOptions = {
    acks?: number
    timeout?: number
    compression?: Kafka.CompressionTypes
}

type KCommitParams = Pick<Kafka.TopicPartitionOffsetAndMetadata, 'topic' | 'partition' | 'offset'>

export declare interface KSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => Kafka.Consumer
}

export declare interface KSink extends Kafka.Producer {}

export declare type RekeyFunction = (s: any) => any /*TBD*/
export declare type SinkDataFunction = (s: any) => Kafka.Message /*TBD*/

type ExchangeEmitTask = T<
    { key: string | number, value: string },
    { key: string | number, value: string },
    any, void, false, null, false
>

export declare interface KExchange<OnMessage = any, EmitMessage = any> {
    setKeyParser: (fn: (x: OnMessage) => string | number) => void;
    setValidationFunction: (fn: (x: OnMessage) => boolean | any) => void;
    on: <R>(fn: (x: OnMessage) => R) => Promise<T<void, R, any, OnMessage, true, null, false>>;
    emit: (mex: EmitMessage) => Promise<ExchangeEmitTask>
}

export declare type DefaultExchangeMessageKind = {
    kind: NonNullable<any>
    metadata: NonNullable<{
        key: NonNullable<string>
    }>
    spec: NonNullable<any>
}

/** Initialize Kafka client. */
export declare function KafkaClient(config: Kafka.KafkaConfig): Kafka.Kafka

/** Initialize a Kafka Admin client. */
export declare function KafkaAdmin(client: Kafka.Kafka): Promise<Kafka.Admin>

/** Initialize a Kafka source (consumer). */
export declare function KafkaSource(client: Kafka.Kafka, config: {
    groupId: string,
    topics: Array<{
        topic: string,
        fromBeginning?: boolean
        autoCommit?: boolean
        autoHeartbeat?: number
        parseWith?: (x: string) => any // this should be removed for type safety
    }>
}): Promise<KSource>

/** Initialize a Kafka sink (producer). */
export declare function KafkaSink(client: Kafka.Kafka, config?: Kafka.ProducerConfig): Promise<KSink>

export declare function KafkaCommit(source: KSource, params: KCommitParams): Promise<KCommitParams>

export declare function KafkaRekey(kafkaSource: KSource, rekeyFunction: RekeyFunction, kafkaSink: KSink, sinkTopic: string, sinkDataFunction: SinkDataFunction): void

// DefaultExchangeMessageKind instead of any will break existent code (maybe any is better?)
// A better option would be not to use a enbedded message validator, but to provide an defaultMessageValidator
// and defaultKeyValidator that one can import and use
/** Initialize a Kafka Exchange. */
export declare function Exchange<
    OnMessage = DefaultExchangeMessageKind,
    EmitMessage = DefaultExchangeMessageKind
>(
    client: Kafka.Kafka,
    topic: string,
    groupId: string,
    sourceOptions?: {
        fromBeginning?: boolean
        autoCommit?: boolean
        autoHeartbeat?: number
    },
    sinkOptions?: KSinkOptions
): Promise<KExchange<OnMessage, EmitMessage>>

export declare interface PlsSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => Pulsar.Consumer
}

export declare interface PlsWsSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => void
}

export declare interface PlsSink extends Pulsar.Producer {}

export declare interface PlsWsSink extends Ws.WebSocket {}

export declare function PulsarClient(config: Pulsar.ClientConfig): Pulsar.Client
export declare function PulsarSource(client: Pulsar.Client, consumerConfig: Pulsar.ConsumerConfig): Promise<PlsSource>
export declare function PulsarSourceWs(source: string /*????*/, options: Ws.ClientOptions): Promise<PlsWsSource>
export declare function PulsarSink(client: Pulsar.Client, producerConfig: Pulsar.ProducerConfig): Promise<PlsSink>
export declare function PulsarSinkWs(sources: string | string[], options: Ws.ClientOptions): Promise<PlsWsSink>

export declare interface NatsJsSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => void
}

export declare interface NatsStreamMsg<T> {
    data: T,
    m: {
        msg: Nats.JsMsg,
        didAck: boolean,
    }
}

/** Initialize a Nats connection */
export declare function NatsClient(server: Nats.ConnectionOptions): Promise<Nats.NatsConnection>

/** Initialize a Nats Jetstream source */
export declare function NatsJetstreamSource(natsCliens: Nats.NatsConnection, sources: (Nats.ConsumerConfig & { stream: string })[]): Promise<NatsJsSource>

type ElemOfArr<T extends any[]> = T extends (infer U)[] ? U : never;

/** returns the nested element of both 1d and 2d arrays */
type NestedElem<T> = T extends readonly (infer U)[]
    ? U extends readonly (infer V)[]
    ? V
    : U
    : never;

/** List of storage systems that are suitable for windowing. */
type WindowStorageKind =
    StorageKind.Memory |
    StorageKind.Redis |
    StorageKind.Cassandra

/** List of storage systems that are suitable for queuing. */
type QueueStorageKind =
    StorageKind.Redis

/** List of storage systems that are suitable for lists. */
type ListStorageKind =
    StorageKind.Redis |
    StorageKind.Cassandra |
    StorageKind.Memory

/** List of storage systems that are suitable for collect operator. */
type CollectStorageKind =
    StorageKind.Cassandra
