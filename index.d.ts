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
export declare type TaskMessage<T> = {
    payload: T
    metadata: TaskMessageMetadata //| TaskMessageMetadata[], // can be an array of metadata because of joinByKeyWithParallelism
    globalState: any,
    [x: string]: any
}

export declare type TaskMessageMetadata = {
    key: string | number
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
 * @T current message type 
 * @L local storage value types
 * @Ls is local storage set (default: *false*)
 * @Ms are metadata set (default: *false*)
 * @Sk task storage system kind (default: *null*) */
export declare interface AlyxTask<I, T, L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> {
    /** Initializes task metadata.
     * @enables *setMetadata()*, *getMetadata()*. */
    withMetadata: () => AlyxTask<I, T, L, Ls, Sk, true>

    /** @requires *task.withMetadata()*. */
    setMetadata: Ms extends true 
    ? (id: any) => AlyxTask<I, T, L, Ls, Sk, Ms>
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
    withDefaultKey: () => AlyxTask<I, T, L, Ls, Sk, Ms>

    /** Sets the event time from the message payload. */
    withEventTime: (cb: (x: T) => number) => AlyxTask<I, T, L, Ls, Sk, Ms>

    /** Sets the message key from the message payload. */
    keyBy: (cb: (x: T) => string | number) => AlyxTask<I, T, L, Ls, Sk, Ms>

    filter: (cb: (x: T) => boolean) => AlyxTask<I, T, L, Ls, Sk, Ms>

    print: (str?: any) => AlyxTask<I, T, L, Ls, Sk, Ms>

    /** Splits the task execution into multiple subtasks. Waits for subtasks execution and continues to the next operator passing the array of subtasks results as message. */
    branch: <R = any>(subtaskFuncs: ((x: T) => Promise<AlyxTask<any, R, any, any, any, any>>)[]) => AlyxTask<I, R[], L, Ls, Sk, Ms>

    readline: () => AlyxTask<I, string, L, Ls, Sk, Ms>

    /** Execute a function on the message payload. Can be an async function. */
    fn: <R>(callback: (x: T) => R) => R extends Promise<infer U> 
        ? AlyxTask<I, U, L, Ls, Sk, Ms> 
        : AlyxTask<I, R, L, Ls, Sk, Ms>
    
    /** Execute a function on the raw task message. Can be an async fucntion. */
    fnRaw: <R>(callback: (x: TaskMessage<T>) => R) => R extends Promise<infer U> 
        ? AlyxTask<I, U, L, Ls, Sk, Ms> 
        : AlyxTask<I, R, L, Ls, Sk, Ms>
    
    /** @deprecated use fn() instead */
    customFunction: <R>(callback: (x: T) => R) => AlyxTask<I, R, L, Ls, Sk, Ms>
    
    /** @deprecated use fn() instead */
    customAsyncFunction: <R>(callback: (x: T) => Promise<R>) => AlyxTask<I, R, L, Ls, Sk, Ms>
    
    /** @deprecated use fnRaw() instead */
    customFunctionRaw: <R>(callback: (x: TaskMessage<T>) => R) => AlyxTask<I, R, L, Ls, Sk, Ms>
    
    /** @deprecated use fnRaw() instead */
    customAsyncFunctionRaw: <R>(callback: (x: TaskMessage<T>) => Promise<R>) => AlyxTask<I, R, L, Ls, Sk, Ms>

    // this creates an array of metadata (may cause type errors)
    joinByKeyWithParallelism: (
        storage: Storage<any>, 
        keyFunction: (x: TaskMessage<T>) => string | number, 
        parallelism: number
    ) => AlyxTask<I, T[], L, Ls, Sk, Ms>

    parallel: <Pf extends () => any>(numberOfProcess: number, produceFunction?: Pf) => AlyxTask<I, null, L, Ls, Sk, Ms>

    queueSize: (storage: Storage<QueueStorageKind>) => AlyxTask<I, number, L, Ls, Sk, Ms> // to check if it's really a number

    enqueue: (storage: Storage<QueueStorageKind>) => AlyxTask<I, number, T, Ls, Sk, Ms> 

    dequeue: <R = any>(storage: Storage<QueueStorageKind>) => AlyxTask<I, R, T, Ls, Sk, Ms>

    multiDequeue: <R = any>(storage: Storage<QueueStorageKind>) => AlyxTask<I, R, T, Ls, Sk, Ms> 

    /** Sets the task internal storage system. 
     * @enables *toStorage()*, *fromStorage()*, *flushStorage()*, *fromStorageToGlobalState()*, *disconnectStorage()*, *collect()*, *storage()*. */
    withStorage: <K extends StorageKind>(storage: Storage<K>) => AlyxTask<I, T, L, Ls, K, Ms>
    
    /** @requires *task.withStorage()*.*/
    toStorage: Sk extends StorageKind 
    ? (keyFunc: (x: TaskMessage<T>) => string | number, valueFunc?: (x: TaskMessage<T>) => any, ttl?: number) => AlyxTask<I, T, L, Ls, Sk, Ms> /*To check*/
    : never

    /** @requires *task.withStorage()*.*/
    toStorageList: Sk extends StorageKind 
    ? (keyFunc: (x: TaskMessage<T>) => string | number, valueFunc?: (x: T) => any, ttl?: number) => AlyxTask<I, T, L, Ls, Sk, Ms> /*To check*/
    : never

    /** @requires *task.withStorage()*
     * @requires lists-compatible storage system */
    fromStorageList: Sk extends ListStorageKind 
    ? <R = any>(keyFunc: (x: TaskMessage<T>) => (string | number)[], valueFunc: (x: T) => R[]) => AlyxTask<I, R[], L, Ls, Sk, Ms> 
    : never

    /** @requires *task.withStorage()*. */
    fromStorageToGlobalState: Sk extends StorageKind 
    ? (keysFunc: (x: TaskMessage<T>) => (string | number)[]) => AlyxTask<I, T, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withStorage()*. */
    disconnectStorage: Sk extends StorageKind 
    ? () => AlyxTask<I, T, L, Ls, Sk, Ms>
    : never
    
    /** @requires *task.withStorage()*. */
    flushStorage: Sk extends StorageKind ? 
    (keysFunc: (x: TaskMessage<T>) => (string | number)[]) => AlyxTask<I, T, L, Ls, Sk, Ms>
    : never
    
    /** @requires *task.withStorage()*. */
    storage: Sk extends StorageKind 
    ? () => Storage<any>
    : never

    /** Sets the task in-memory key-value store. 
     * @enables *setLocalKV()*, *setLocalKVRaw()*, *getLocalKV*(), *mergeLocalKV()*, *flushLocalKV().* */
    withLocalKVStorage: <newL = any>() => AlyxTask<I, T, newL, true, Sk, Ms> // define the type of items stored in storage keys

    /** @requires *task.withLocalKVStorage()*. */
    setLocalKV: Ls extends true 
    ? (key: string | number, func: (x: T) => L) => AlyxTask<I, T, L, Ls, Sk, Ms>
    : never

    /** @requires *task.withLocalKVStorage()*. */
    setLocalKVRaw: Ls extends true 
    ? (key: string | number, func: (x: TaskMessage<T>) => L) => AlyxTask<I, T, L, Ls, Sk, Ms>
    : never
   
    /** @requires *task.withLocalKVStorage()*. */
    getLocalKV: Ls extends true 
    ? <K>(key?: K) => K extends Exclude<K, string | number> // check if key is provided
        ? AlyxTask<I, { [x in string | number]: L }, L, Ls, Sk, Ms> // not provided => returns full storage
        : AlyxTask<I, L, L, Ls, Sk, Ms> // provided => returns single storage value
    : never
    
    /** @requires *task.withLocalKVStorage()*. */
    flushLocalKV: Ls extends true 
    ? (key: string | number) => AlyxTask<I, T, L, Ls, Sk, Ms>
    : never

    /** @requires windowing-compatible storage system */
    tumblingWindowCount: (storage: Storage<WindowStorageKind>, countLength: number, inactivityMilliseconds: number) => AlyxTask<I, T[], L, Ls, Sk, Ms>

    /** @requires windowing-compatible storage system */
    tumblingWindowTime: (storage: Storage<WindowStorageKind>, timeLengthMilliSeconds: number, inactivityMilliseconds?: number) => AlyxTask<I, T[], L, Ls, Sk, Ms>

    /** @requires windowing-compatible storage system */
    sessionWindowTime: (storage: Storage<WindowStorageKind>, inactivityMilliseconds: number) => AlyxTask<I, T[], L, Ls, Sk, Ms>

    /** @requires windowing-compatible storage system */
    slidingWindowCount: (storage: Storage<WindowStorageKind>, countLength: number, slidingLength: number, inactivityMilliseconds: number) => AlyxTask<I, T[], L, Ls, Sk, Ms>

    /** @requires windowing-compatible storage system */
    slidingWindowTime: (storage: Storage<WindowStorageKind>, timeLengthMilliSeconds: number, slidingLengthMilliseconds: number, inactivityMilliseconds: number) => AlyxTask<I, T[], L, Ls, Sk, Ms>

    /** Procudes task messages iterating over the provided array. */ 
    fromArray: <R>(array: R[]) => AlyxTask<I, R, L, Ls, Sk, Ms>

    /** Procudes a single task message from the provided object. */ 
    fromObject: <R>(object: R) => AlyxTask<I, R, L, Ls, Sk, Ms>

    /** Procudes a single task message from the provided string. */ 
    fromString: (string: string) => AlyxTask<I, string, L, Ls, Sk, Ms>

    /** Procudes task messages iterating by ticking at the provided time interval. */ 
    fromInterval: <R = number>(intervalMs: number, generatorFunc?: (counter: number) => R, maxSize?: number) => AlyxTask<I, R, L, Ls, Sk, Ms>/*TBD*/

    fromReadableStream: (filePath: fs.PathLike, useZlib?: boolean) => AlyxTask<I, fs.ReadStream, L, Ls, Sk, Ms>

    /** Produces a message to a Kafka topic. */
    toKafka: T extends (Kafka.Message | Kafka.Message[]) 
    ? (kafkaSink: KSink, topic: string, callback?: (x: T) => Kafka.Message | Kafka.Message[], options?: KSinkOptions) => AlyxTask<I, T, L, Ls, Sk, Ms>
    : (kafkaSink: KSink, topic: string, callback: (x: T) => Kafka.Message | Kafka.Message[], options?: KSinkOptions) => AlyxTask<I, T, L, Ls, Sk, Ms>

    /** Consume messages from a Kafka source. */
    fromKafka: <R = any>(source: KSource) => AlyxTask<I, KMessage<R>, L, Ls, Sk, Ms>

    kafkaCommit: T extends KCommitParams 
    ? (kafkaSource: KSource, commitParams?: KCommitParams) => AlyxTask<I, T, L, Ls, Sk, Ms>
    : (kafkaSource: KSource, commitParams: KCommitParams) => AlyxTask<I, T, L, Ls, Sk, Ms>
 
    fromPulsar: (source: PlsSource) => AlyxTask<I, Pulsar.Message, L, Ls, Sk, Ms>
 
    toPulsar: (sink: PlsSink, keyCb: (x: T) => any /*TBD*/, dataCb: (x: T) => any) => AlyxTask<I, T, L, Ls, Sk, Ms>
 
    flushPulsar: (sink: PlsSink) => AlyxTask<I, T, L, Ls, Sk, Ms>,
 
    toPulsarWs: (sink: PlsWsSink, keyCb: (x: T) => any /*TBD*/, dataCb: (x: T) => any) => AlyxTask<I, T, L, Ls, Sk, Ms>,
 
    parsePulsar: <R = any>(parseWith?: (x: string) => R) => AlyxTask<I, R, L, Ls, Sk, Ms>,
 
    ackPulsar: (sink: PlsSource) => AlyxTask<I, T, L, Ls, Sk, Ms>,

    /** Watch changes over an Etcd key. */
    fromEtcd: (storage: Storage<StorageKind.Etcd>, key: string | number, watch?: boolean) => AlyxTask<I, Etcd.IKeyValue, L, Ls, Sk, Ms>,

    /** Consumes messages from a NATS Jetstream stream */
    fromNats: <R = any>(source: NatsJsSource) => AlyxTask<I, NatsStreamMsg<R>, L, Ls, Sk, Ms>,

    // dataCb is not called in this sink
    /** Produces a message to a NATS Jetstream stream. */
    toNats: (sink: Nats.NatsConnection, topic: string, dataCb?: (x: T) => any) => AlyxTask<I, T, L, Ls, Sk, Ms>,

    /** Acquires a lock on a storage key using a smartlocks library mutex. */
    lock: (mutex: Smartlocks.Mutex, lockKeyFn: (x: T) => string | number, retryTimeMs?: number, ttl?: number) => AlyxTask<I, T, L, Ls, Sk, Ms>,

    /** Releases a lock on a storage key using a smartlocks library mutex. */
    release: (mutex: Smartlocks.Mutex, lockKeyFn: (x: T) => string | number) => AlyxTask<I, T, L, Ls, Sk, Ms>,

    /** Progressively sums messages, returning the current counter value.
     * @requires *number* */
    sum: T extends number 
    ? () => AlyxTask<I, number, L, Ls, Sk, Ms>  
    : never

    /** Push a new message to the task. */
    inject: (data: I) => Promise<AlyxTask<I, T, L, Ls, Sk, Ms>>

    /** Starts the task execution when using a source. */
    close: () => Promise<AlyxTask<I, T, L, Ls, Sk, Ms>>

    /** Return the last result of the task. */
    finalize: <R = T>() => R

    self: (cb: (task: AlyxTask<I, T, L, Ls, Sk, Ms>) => any) => AlyxTask<I, T, L, Ls, Sk, Ms>

    /** @requires *task.withStorage()*
     * @requires collect-compatible storage system */
    collect: Sk extends CollectStorageKind 
    ? <R = any>(
        idFunction: (x: TaskMessage<T>) => string, 
        keyFunction: (x: TaskMessage<T>) => string, 
        valueFunction: (x: TaskMessage<T>) => R | null, 
        waitUntil: (arr: any[], flat: any[]) => boolean, /* TBD */ 
        emitFunction: (arr: any[], flat: any[]) => boolean, /* TBD */
        ttl?: number,
    ) => AlyxTask<I, T, L, Ls, Sk, Ms> 
    : never,

    sumMap: () => AlyxTask<I, { [x in keyof T]: number }, L, Ls, Sk, Ms>
  
    /** Executes a groupBy for every key of the object message. */
    objectGroupBy: (keyFunction: (x: T) => string | number) => AlyxTask<I, { [x in string | number]: T[] }, L, Ls, Sk, Ms>
  
    /** Aggregates array element by key in a storage system. */
    aggregate: <R = T>(storage: Storage<any>, name: string, keyFunction: (x: T) => string | number) => AlyxTask<I, { [x in string | number]: R[] }, L, Ls, Sk, Ms>  

    /** @requires *task.withLocalKVStorage().* */
    mergeLocalKV: Ls extends true 
    ? <K extends string | number>(key: K) => AlyxTask<I, T & { [x in K]: L }, L, Ls, Sk, Ms>
    : never

    /** Transform array
    * @requires *array* */
    map: T extends (infer U)[] 
    ? <R>(func: (x: U) => R) => AlyxTask<I, R[], L, Ls, Sk, Ms> 
    : never
    
    /** Splits the task execution for each element of the array.
     * @requires *array* */
    each: T extends (infer U)[] 
    ? (func?: (x: U) => any) => AlyxTask<I, U, L, Ls, Sk, Ms> 
    : never
    
    /** Filters array elements.
     *  @requires *array* */
    filterArray: T extends (infer U)[] 
    ? (func: (x: U) => boolean) => AlyxTask<I, T, L, Ls, Sk, Ms> 
    : never
    
    // why does this implement a number only internal reduce function? (sum)
    // reduce: <R>(func: (prev: ElemOfArr<T>, curr: ElemOfArr<T>, currIdx?: number) => R, initialValue?: R) => Tsk<I, R, L, Ls, Ss, Ms>
    /** @requires *array* */
    reduce: T extends (infer U)[] 
    ? (func?: (x: U) => number) => AlyxTask<I, number, L, Ls, Sk, Ms> 
    : never

    /** Count array element by key.
     * @requires *array* */
    countInArray: T extends (infer U)[] 
    ? (func: (x: U) => string | number) => AlyxTask<I, { [x in string | number]: number }, L, Ls, Sk, Ms> 
    : never
    
    /** Returns the array length.
     * @requires *array* */
    length: T extends any[] 
    ? () => AlyxTask<I, number, L, Ls, Sk, Ms> 
    : never
    
    /** @requires *array* */
    groupBy: T extends (infer U)[] 
    ? (func: (elem: U, index?: number, array?: U[]) => any) => AlyxTask<I, { [x in string | number]: U[] }, L, Ls, Sk, Ms> 
    : never

    /** @requires *task.withStorage()*
     * @requires *array* */
    fromStorage: Sk extends null 
    ? never 
    : T extends any[] 
    ? (keysFunc: (x: TaskMessage<T>) => (string | number)[]) => AlyxTask<I, unknown[], L, Ls, Sk, Ms> 
    : never
    
    /** Flattens an array. 
     * @requires *array* */ 
    flat: T extends any[] 
    ? () => AlyxTask<I, NestedElem<T>[], L, Ls, Sk, Ms> 
    : never

    /** Splits a string (default separator: '\s'). 
     * @requires *string* */
    tokenize: T extends string 
    ? (separator?: string) => AlyxTask<I, string[], L, Ls, Sk, Ms>
    : never

    // prevents type errors for task extensions
    [x: string]: any
}

export declare type TaskExtension<T, U extends any[]> = (first: T, ...rest: U) => void;

/** Intialize an Alyxstream task. Generic type can be used to provide the initial *inject()* message type. */
export declare function Task<I = any>(id?: any): AlyxTask<I, I, void, false, null, false> /*TBD*/

/** Extends a task by creating a custom method. This function is **type unsafe**. Consider using **fn()** with a custom callback for type safety. */
export declare function ExtendTask(name: string, extension: TaskExtension<any, any>): void

/** Extends a task by creating a custom method that operates on the raw task message. This function is **type unsafe**. Consider using **fnRaw()** with a custom callback for type safety. */
export declare function ExtendTaskRaw(name: string, extension: TaskExtension<TaskMessage<any>, any>): void

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

type KCompressionType = 
    Kafka.CompressionTypes.GZIP |
    Kafka.CompressionTypes.LZ4 |
    Kafka.CompressionTypes.None |
    Kafka.CompressionTypes.Snappy |
    Kafka.CompressionTypes.ZSTD 

export declare type KSinkOptions = { 
    compressionType: KCompressionType
}

type KCommitParams = Pick<Kafka.TopicPartitionOffsetAndMetadata, 'topic' | 'partition' | 'offset'>

export declare interface KSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => Kafka.Consumer
}

export declare interface KSink extends Kafka.Producer {}

export declare type RekeyFunction = (s: any) => any /*TBD*/
export declare type SinkDataFunction = (s: any) => Kafka.Message /*TBD*/

type ExchangeEmitTask = AlyxTask<
    { key: string | number, value: string }, 
    { key: string | number, value: string }, 
    void, false, null, false
>

export declare interface KExchange<OnMessage, EmitMessage> {
    setKeyParser: (fn: (x: OnMessage) => string | number) => void;
    setValidationFunction: (fn: (x: OnMessage) => boolean | any) => void;
    on: <R>(fn: (x: OnMessage) => R) => Promise<AlyxTask<void, R, OnMessage, true, null, false>>;
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
export declare function KafkaSource(client: Kafka.Kafka, config: Kafka.ConsumerConfig & { topics: [{ topic: string, [x: string]: any }] }): Promise<KSource>

/** Initialize a Kafka sink (producer). */
export declare function KafkaSink(client: Kafka.Kafka, config: Kafka.ProducerConfig): Promise<KSink>

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
    sourceOptions?: Kafka.ConsumerConfig, 
    sinkOptions?: Kafka.ProducerConfig
): KExchange<OnMessage, EmitMessage>

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