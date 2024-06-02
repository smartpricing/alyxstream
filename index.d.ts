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
    windowElements?: any[]
}

// T = current value type
// I = initial value type (needed for the "inject" method)
// L = type of local storage properties (void by default, any if not set)
// Ls = is local storage set (false by default)
// Sk = task storage kind (null by default)
// Ms = is metadata set (false by default)

// ternary type to determine the correct operator, depending on the message type
type Tsk<I, T, L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> = 
    T extends (infer U)[]
    ? TaskOfArray<I, U[], L, Ls, Sk, Ms> 
    : T extends string
    ? TaskOfString<I, T, L, Ls, Sk, Ms>
    : T extends number 
    ? TaskBase<I, T, L, Ls, Sk, Ms>
    : T extends (Kafka.Message | Kafka.Message[])
    ? TaskOfKafkaMessage<I, T, L, Ls, Sk, Ms> 
    : T extends KCommitParams
    ? TaskOfKafkaCommitParams<I, T, L, Ls, Sk, Ms> 
    : TaskOfObject<I, T, L, Ls, Sk, Ms>  


export declare interface TaskBase<I, T, L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> {
    /** Initializes task metadata. Enables *setMetadata()* and *getMetadata()*. */
    withMetadata: () => Tsk<I, T, L, Ls, Sk, true>

    /** Requires *task.withMetadata()*. */
    setMetadata: Ms extends false ? never : (id: any) => Tsk<I, T, L, Ls, Sk, Ms>
    
    /** Returns task metadata. Requires *task.withMetadata()*. */
    getMetadata: Ms extends false ? never : () => { 
        id: any, 
        [x: string]: any
        [x: number]: any
    }

    /** Sets the message key to *"default"* */
    withDefaultKey: () => Tsk<I, T, L, Ls, Sk, Ms>

    /** Sets the event time from the message payload. */
    withEventTime: (cb: (x: T) => number) => Tsk<I, T, L, Ls, Sk, Ms>

    /** Sets the message key from the message payload. */
    keyBy: (cb: (x: T) => string | number) => Tsk<I, T, L, Ls, Sk, Ms>

    filter: (cb: (x: T) => boolean) => Tsk<I, T, L, Ls, Sk, Ms>

    print: (str?: any) => Tsk<I, T, L, Ls, Sk, Ms>

    /** Splits the task execution into multiple subtasks. Waits for subtasks execution and continues to the next operator passing the array of subtasks results as message. */
    branch: <R = any>(subtaskFuncs: ((x: T) => Promise<Tsk<any, R, any, any, any, any>>)[]) => Tsk<I, R[], L, Ls, Sk, Ms>

    readline: () => Tsk<I, string, L, Ls, Sk, Ms>

    /** Execute a function on the message payload. Can be an async function. */
    fn: <R>(callback: (x: T) => R) => R extends Promise<infer U> 
        ? Tsk<I, U, L, Ls, Sk, Ms> 
        : Tsk<I, R, L, Ls, Sk, Ms>
    
    /** Execute a function on the raw task message. Can be an async fucntion. */
    fnRaw: <R>(callback: (x: TaskMessage<T>) => R) => R extends Promise<infer U> 
        ? Tsk<I, U, L, Ls, Sk, Ms> 
        : Tsk<I, R, L, Ls, Sk, Ms>
    
    /** @deprecated use fn() instead */
    customFunction: <R>(callback: (x: T) => R) => Tsk<I, R, L, Ls, Sk, Ms>
    
    /** @deprecated use fn() instead */
    customAsyncFunction: <R>(callback: (x: T) => Promise<R>) => Tsk<I, R, L, Ls, Sk, Ms>
    
    /** @deprecated use fnRaw() instead */
    customFunctionRaw: <R>(callback: (x: TaskMessage<T>) => R) => Tsk<I, R, L, Ls, Sk, Ms>
    
    /** @deprecated use fnRaw() instead */
    customAsyncFunctionRaw: <R>(callback: (x: TaskMessage<T>) => Promise<R>) => Tsk<I, R, L, Ls, Sk, Ms>

    /**  */
    joinByKeyWithParallelism: (
        storage: Storage<any>, 
        keyFunction: (x: TaskMessage<T>) => string | number, 
        parallelism: number
    ) => Tsk<I, T[], L, Ls, Sk, Ms>

    // TO BE CHECKED 
    parallel: <Pf extends () => any>(numberOfProcess: number, produceFunction?: Pf) => Tsk<I, null, L, Ls, Sk, Ms>

    queueSize: (storage: Storage<any>) => Tsk<I, number, L, Ls, Sk, Ms> // to check if it's really a number

    enqueue: (storage: Storage<any>) => Tsk<I, number, T, Ls, Sk, Ms> 

    dequeue: <R = any>(storage: Storage<any>) => Tsk<I, R, T, Ls, Sk, Ms>  // R is expected result

    /** Sets the task internal storage system. Enables *toStorage()*, *fromStorage()*, *flushStorage*, *fromStorageToGlobalState()*, *disconnectStorage()*, *collect()* and *storage()*. */
    withStorage: <K extends StorageKind>(storage: Storage<StorageKind>) => Tsk<I, T, L, Ls, K, Ms>
    
    /** Requires *task.withStorage()*.*/
    toStorage: Sk extends null ? never : (keyFunc: (x: TaskMessage<T>) => string | number, valueFunc?: (x: TaskMessage<T>) => any, ttl?: number) => Tsk<I, T, L, Ls, Sk, Ms> /*To check*/
    
    /** Requires *task.withStorage()*.*/
    toStorageList: Sk extends null ? never : (keyFunc: (x: TaskMessage<T>) => string | number, valueFunc?: (x: T) => any, ttl?: number) => Tsk<I, T, L, Ls, Sk, Ms> /*To check*/

    /** Requires *task.withStorage()*.*/
    fromStorageList: Sk extends null ? never : <R = any>(keyFunc: (x: TaskMessage<T>) => (string | number)[], valueFunc: (x: T) => R[]) => Tsk<I, R[], L, Ls, Sk, Ms> 

    /** Requires *task.withStorage()*. */
    fromStorageToGlobalState: Sk extends null ? never : (keysFunc: (x: TaskMessage<T>) => (string | number)[]) => Tsk<I, T, L, Ls, Sk, Ms>
    
    /** Requires *task.withStorage()*. */
    disconnectStorage: Sk extends null ? never : () => Tsk<I, T, L, Ls, Sk, Ms>
    
    /** Requires *task.withStorage()*. */
    flushStorage: Sk extends null ? never : (keysFunc: (x: TaskMessage<T>) => (string | number)[]) => Tsk<I, T, L, Ls, Sk, Ms>
    
    /** Requires *task.withStorage()*. */
    storage: Sk extends null ? never : () => Storage<any>

    /** Sets the task in-memory key-value store. Enables *setLocalKV()*, *setLocalKVRaw()*, *getLocalKV*(), *mergeLocalKV()* and *flushLocalKV().* */
    withLocalKVStorage: <newL = any>() => Tsk<I, T, newL, true, Sk, Ms> // define the type of items stored in storage keys

    /** Requires *task.withLocalKVStorage()*. */
    setLocalKV: Ls extends false ? never : (key: string | number, func: (x: T) => L) => Tsk<I, T, L, Ls, Sk, Ms>

    /** Requires *task.withLocalKVStorage()*. */
    setLocalKVRaw: Ls extends false ? never : (key: string | number, func: (x: TaskMessage<T>) => L) => Tsk<I, T, L, Ls, Sk, Ms>
   
    /** Requires *task.withLocalKVStorage()*. */
    getLocalKV: Ls extends false ? never : <K>(key?: K) => K extends Exclude<K, string | number> // check if key is provided
        ? Tsk<I, { [x in string | number]: L }, L, Ls, Sk, Ms> // not provided => returns full storage
        : Tsk<I, L, L, Ls, Sk, Ms> // provided => returns single storage value
    
    /** Requires *task.withLocalKVStorage()*. */
    flushLocalKV: Ls extends false ? never : (key: string | number) => Tsk<I, T, L, Ls, Sk, Ms> 

    tumblingWindowCount: (storage: Storage<WindowStorageKind>, countLength: number, inactivityMilliseconds: number) => Tsk<I, T[], L, Ls, Sk, Ms>

    tumblingWindowTime: (storage: Storage<WindowStorageKind>, timeLengthMilliSeconds: number, inactivityMilliseconds?: number) => Tsk<I, T[], L, Ls, Sk, Ms>

    sessionWindowTime: (storage: Storage<WindowStorageKind>, inactivityMilliseconds: number) => Tsk<I, T[], L, Ls, Sk, Ms>

    slidingWindowCount: (storage: Storage<WindowStorageKind>, countLength: number, slidingLength: number, inactivityMilliseconds: number) => Tsk<I, T[], L, Ls, Sk, Ms>

    slidingWindowTime: (storage: Storage<WindowStorageKind>, timeLengthMilliSeconds: number, slidingLengthMilliseconds: number, inactivityMilliseconds: number) => Tsk<I, T[], L, Ls, Sk, Ms>

    /** Procudes task messages iterating over the provided array. */ 
    fromArray: <R>(array: R[]) => Tsk<I, R, L, Ls, Sk, Ms>

    /** Procudes a single task message from the provided object. */ 
    fromObject: <R>(object: R) => Tsk<I, R, L, Ls, Sk, Ms>

    /** Procudes a single task message from the provided string. */ 
    fromString: (string: string) => Tsk<I, string, L, Ls, Sk, Ms>

    /** Procudes task messages iterating by ticking at the provided time interval. */ 
    fromInterval: <R = number>(intervalMs: number, generatorFunc?: (counter: number) => R, maxSize?: number) => Tsk<I, R, L, Ls, Sk, Ms>/*TBD*/

    fromReadableStream: (filePath: fs.PathLike, useZlib?: boolean) => Tsk<I, fs.ReadStream, L, Ls, Sk, Ms>

    toKafka: (kafkaSink: KSink, topic: string, callback: (x: T) => Kafka.Message | Kafka.Message[], options?: KSinkOptions) => Tsk<I, T, L, Ls, Sk, Ms>

    fromKafka: <R = any>(source: KSource) => Tsk<I, KMessage<R>, L, Ls, Sk, Ms>

    kafkaCommit: (kafkaSource: KSource, commitParams: KCommitParams) => Tsk<I, T, L, Ls, Sk, Ms>
 
    fromPulsar: (source: PlsSource) => Tsk<I, Pulsar.Message, L, Ls, Sk, Ms>
 
    toPulsar: (sink: PlsSink, keyCb: (x: T) => any /*TBD*/, dataCb: (x: T) => any) => Tsk<I, T, L, Ls, Sk, Ms>
 
    flushPulsar: (sink: PlsSink) => Tsk<I, T, L, Ls, Sk, Ms>,
 
    toPulsarWs: (sink: PlsWsSink, keyCb: (x: T) => any /*TBD*/, dataCb: (x: T) => any) => Tsk<I, T, L, Ls, Sk, Ms>,
 
    parsePulsar: <R = any>(parseWith?: (x: string) => R) => Tsk<I, R, L, Ls, Sk, Ms>,
 
    ackPulsar: (sink: PlsSource) => Tsk<I, T, L, Ls, Sk, Ms>,
 
    // fromPulsarWs: never, // not implemented

    fromEtcd: (storage: Storage<StorageKind.Etcd>, key: string | number, watch?: boolean) => Tsk<I, Etcd.IKeyValue, L, Ls, Sk, Ms>,

    /** Consumes messages from a NATS Jetstream stream */
    fromNats: <R = any>(source: NatsJsSource) => Tsk<I, NatsStreamMsg<R>, L, Ls, Sk, Ms>,

    // dataCb is not called in this sink
    /** Produces a message to a NATS Jetstream stream. */
    toNats: (sink: Nats.NatsConnection, topic: string, dataCb?: (x: T) => any) => Tsk<I, T, L, Ls, Sk, Ms>,

    /** Acquires a lock on a storage key using a smartlocks library mutex. */
    lock: (mutex: Smartlocks.Mutex, lockKeyFn: (x: T) => string | number, retryTimeMs?: number, ttl?: number) => Tsk<I, T, L, Ls, Sk, Ms>,

    /** Releases a lock on a storage key using a smartlocks library mutex. */
    release: (mutex: Smartlocks.Mutex, lockKeyFn: (x: T) => string | number) => Tsk<I, T, L, Ls, Sk, Ms>,

    /** Progressively sums messages, returning the current counter value. Only works for when message type is *number* */
    sum: T extends number 
    ? () => Tsk<I, number, L, Ls, Sk, Ms>  
    : never

    /** Push a new message to the task. */
    inject: (data: I) => Promise<Tsk<I, T, L, Ls, Sk, Ms>>

    /** Starts the task execution when using a source. */
    close: () => Promise<Tsk<I, T, L, Ls, Sk, Ms>>

    /** Return the last result of the task. */
    finalize: <R = T>() => R

    self: (cb: (task: Tsk<I, T, L, Ls, Sk, Ms>) => any) => Tsk<I, T, L, Ls, Sk, Ms>

    /** Requires *task.withStorage()*. */
    collect: Sk extends null ? never : (
        idFunction: (x: TaskMessage<T>) => string | number, 
        keyFunction: (x: TaskMessage<T>) => string | number, 
        valueFunction: <R = any>(x: TaskMessage<T>) => R | null, 
        waitUntil: (arr: any[], flat: any[]) => boolean, /* TBD */ 
        emitFunction: (arr: any[], flat: any[]) => boolean, /* TBD */
        ttl?: number,
    ) => Promise<Tsk<I, T, L, Ls, Sk, Ms>>,

    // prevents type errors for task extensions
    [x: string]: any
}

export declare interface TaskOfArray<I, T extends any[], L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> extends TaskOfObject<I, T, L, Ls, Sk, Ms> {
    map: <R>(func: (x: ElemOfArr<T>) => R) => Tsk<I, R[], L, Ls, Sk, Ms>
    
    /** Splits the task execution for each element of the array. */
    each: (func?: (x: ElemOfArr<T>) => any) => Tsk<I, ElemOfArr<T>, L, Ls, Sk, Ms>
    
    filterArray: (func: (x: ElemOfArr<T>) => boolean) => Tsk<I, T, L, Ls, Sk, Ms>
    
    // why does this implement a number only internal reduce function? (sum)
    // reduce: <R>(func: (prev: ElemOfArr<T>, curr: ElemOfArr<T>, currIdx?: number) => R, initialValue?: R) => Tsk<I, R, L, Ls, Ss, Ms>
    reduce: (func?: (x: ElemOfArr<T>) => number) => Tsk<I, number, L, Ls, Sk, Ms>

    /** Count array element by key. */
    countInArray: (func: (x: ElemOfArr<T>) => string | number) => Tsk<I, { [x in string | number]: number }, L, Ls, Sk, Ms>
    
    /** Returns the array length. */
    length: () => Tsk<I, number, L, Ls, Sk, Ms>
    
    groupBy: (func: (elem: ElemOfArr<T>, index?: number, array?: T[]) => any) => Tsk<I, { [x in string | number]: T[] }, L, Ls, Sk, Ms> 

    /** Requires *task.withStorage()*. */
    fromStorage: Sk extends null ? never : (keysFunc: (x: TaskMessage<T>) => (string | number)[]) => Tsk<I, unknown[], L, Ls, Sk, Ms> /*To check*/
    // it seems that fromStorage is available only if the message payload value is an array
    // since it pushes the stored values into the message payload
    
    flat: () => Tsk<I, NestedElem<T>[], L, Ls, Sk, Ms>

    [x: string]: any
}

export declare interface TaskOfObject<I, T, L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> extends TaskBase<I, T, L, Ls, Sk, Ms> {
    //sumMap should belong to an hypothetical TaskOfObjectOfArrays or TaskOfObjectOfStrings type (because it sums fields lenghts)
    /** Only works for objects whose values are arrays or strings (or anyting with a *length: number* property), otherwise will throw an error. */
    sumMap: () => Tsk<I, { [x in keyof T]: number }, L, Ls, Sk, Ms>
  
    /** Executes a groupBy for every key of the object message. */
    objectGroupBy: (keyFunction: (x: T) => string | number) => Tsk<I, { [x in string | number]: T[] }, L, Ls, Sk, Ms>
  
    /** Aggregates array element by key in a storage system. */
    aggregate: <R = T>(storage: Storage<any>, name: string, keyFunction: (x: T) => string | number) => Tsk<I, { [x in string | number]: R[] }, L, Ls, Sk, Ms>  

    /** Requires *task.withLocalKVStorage().* */
    mergeLocalKV: Ls extends false ? never : <K extends string | number>(key: K) => Tsk<I, T & { [x in K]: L }, L, Ls, Sk, Ms> 
}

export declare interface TaskOfString<I, T extends string, L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> extends TaskOfObject<I, T, L, Ls, Sk, Ms> {
    /** Splits the string message using a separator (space character the default separator). */
    tokenize: (separator?: string) => Tsk<I, string[], L, Ls, Sk, Ms>
}

export declare interface TaskOfKafkaMessage<I, T extends (Kafka.Message | Kafka.Message[]), L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> extends TaskOfObject<I, T, L, Ls, Sk, Ms> {
    toKafka: (kafkaSink: KSink, topic: string, callback?: (x: T) => Kafka.Message | Kafka.Message[], options?: KSinkOptions) => Tsk<I, T, L, Ls, Sk, Ms>
    kafkaCommit: (kafkaSource: KSource, commitParams?: KCommitParams) => Tsk<I, T, L, Ls, Sk, Ms>
}

export declare interface TaskOfKafkaCommitParams<I, T extends KCommitParams, L, Ls extends boolean, Sk extends StorageKind, Ms extends boolean> extends TaskOfObject<I, T, L, Ls, Sk, Ms> {
    kafkaCommit: (kafkaSource: KSource, commitParams?: KCommitParams) => Tsk<I, T, L, Ls, Sk, Ms>
}

export declare type TaskExtension<T, U extends any[]> = (first: T, ...rest: U) => void;

/** Intialize an Alyxstream task. Generic type can be used to provide the initial *inject()* message type. */
export declare function Task<I = any>(id?: any): Tsk<I, I, void, false, null, false> /*TBD*/

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
export declare type OpensearchNode = string | string[] | Opensearch.NodeOptions | Opensearch.NodeOptions[]

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
    __kind: K // not a real Storage field - just to make K generic effective
    db: () => any; /*TBD*/
    set: (key: string, value: any, ttl?: number | null) => Promise<void>; /*TBD*/
    get: (key: string) => Promise<any>; /*TBD*/
    push: (key: string, value: any) => Promise<void>; /*TBD*/
    getList: (key: string) => Promise<any[]>; /*TBD*/
    flush: (key: string) => Promise<void>; /*TBD*/
    slice: (key: string, numberOfItemsToRemove: number) => Promise<void>; /*TBD*/
    sliceByTime: (key: string, startTime: number) => Promise<void>; /*TBD*/
    disconnect: () => Promise<void>; /*TBD*/
    flushStorage: () => Promise<void>; /*TBD*/
}

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

type ExchangeEmitTask = Tsk<
    { key: string | number, value: string }, 
    { key: string | number, value: string }, 
    void, false, null, false
>

export declare interface KExchange<OnMessage, EmitMessage> {
    setKeyParser: (fn: (x: OnMessage) => string | number) => void;
    setValidationFunction: (fn: (x: OnMessage) => boolean | any) => void;
    on: <R>(fn: (x: OnMessage) => R) => Promise<Tsk<void, R, OnMessage, true, null, false>>;
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

/** List of storage systems that are suitable for windowing */
type WindowStorageKind = 
    StorageKind.Memory |
    StorageKind.Redis |
    StorageKind.Cassandra
