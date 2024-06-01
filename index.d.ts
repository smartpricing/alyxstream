import * as Cassandra from "cassandra-driver";
import * as Pulsar from 'pulsar-client'
import * as Etcd from "etcd3"
import * as Opensearch from "@opensearch-project/opensearch"
import * as Kafka from "kafkajs"
import * as Redis from "ioredis";
import * as Postgres from "pg";
import * as Nats from "nats"
import * as Ws from "ws"
import * as fs from "fs"

/**
 * Note/Domande per Alice
 * 
 *  - i metodi disponibili del task dipenderanno dal tipo del messaggio in quello specifico punto del task
 *    es: Task().fromArray([1,2,3]) avrà a disposizione anche i metodi degli array
 *        Task().fromArray([1,2,3]).length() non ha i metodi degli array perchè il messaggio è number
 *    nota: tutti i tipi sono considerati object di base e quindi hanno i metodi degli objects (es: aggregate)
 * 
 *  - se non viene chiamato withLocalKVStorage, tutti i metodi localKV hanno tipo never (ts dà errore provando a invocarli)
 *  - stessa cosa per withStorage
 *  - stessa cosa per metadata
 * 
 *  - i metodi dei metadata sono corretti o andranno modificati? 
 *    non capisco molto a cosa servano perche mi sembra che si possa modificare solo il campo "id"
 * 
 *  - come per i metodi dello storage, andrebbe impedito di invocare le window quando non sono state
 *     chiamate le funzioni withDefaultKey o byKey?
 * 
 *  - il task ha sempre una proprietà [x: string]: any in modo da permettere l'invocazione
 *    che non sono fra quelli tipizzati (es: le estensioni)
 * 
 *  - il task può essere inizializzato con un tipo se va usato con inject
 *     (es: Task<string>().inject({a: 2}) dà errore perchè non viene iniettata una stringa)
 *     altrimenti il tipo dipende dalla source e dall'oggetto che le viene passato
 *     es: Task().fromArray([1,2,3,4])  -> il tipo del messaggio sarà number[]
 * 
 *  - mi sembra ci sia un'ambiguità nell'operator "branch"
 *     > da quello che è descritto in doc sembra che l'ultimo risultato del task padre venga automaticamente inietato nei subtask,
 *      ma da codice questo non avviene (il payload viene passato alla funzione che ritorna il subtask, ma poi è la funzione 
 *      a doverlo iniettare manualmente nel subtask).
 *      Per ora è tipizzato per come è scritto il codice. 
 * 
 *  - il metodo each degli array non chiama la callback che gli viene passata
 * 
 *  - tutte le keys (proprietà degli oggetti, chiavi dello storage, ecc) sono di tipo string | number
 * 
 * */

// T = current value type
// I = initial value type (needed for the "inject" method)
// L = type of local storage properties (void by default, any if not set)
// Ls = is local storage set (false by default)
// Ss = is storage set (false by default)
// Ms = is metadata set (false by default)

type TaskMessage<T> = {
    payload: T
    key: string | number
}

// ternary type to determine the correct operator, depending on the message type
type TaskTypeHelper<I, T, L, Ls extends boolean, Ss extends boolean, Ms extends boolean> = T extends (infer U)[] // is T an array?
/*  */ ? U extends number // is array of numbers?
/*      */ ? TaskOfNumberArray<I, U[], L, Ls, Ss, Ms> // array of numbers
/*      */ : U extends string // not array of numbers, is array of strings?
/*            */ ? TaskOfStringArray<I, U[], L, Ls, Ss, Ms> // array of strings
/*            */ : TaskOfArray<I, U[], L, Ls, Ss, Ms> // 1 dimension array
/*      */ : T extends string // not an array, is string?
/*      */ ? TaskOfString<I, T, L, Ls, Ss, Ms> // is string
/*      */ : TaskOfObject<I, T, L, Ls, Ss, Ms> // anything else

export declare interface TaskBase<I, T, L, Ls extends boolean, Ss extends boolean, Ms extends boolean> {
    //base
    withMetadata: () => TaskTypeHelper<I, T, L, Ls, Ss, true>
    setMetadata: Ms extends false ? never : (id: any) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    getMetadata: Ms extends false ? never : () => { 
        id: any, 
        [x: string]: any
        [x: number]: any
    }

    withDefaultKey: () => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    withEventTime: (cb: (x: T) => number) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    keyBy: (cb: (x: T) => string | number) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>

    filter: (cb: (x: T) => boolean) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    print: (str?: string) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>

    branch: <R = any>(subtaskFuncs: ((x: T) => Promise<TaskTypeHelper<any, R, any, any, any, any>>)[]) => TaskTypeHelper<I, R[], L, Ls, Ss, Ms>
    readline: () => TaskTypeHelper<I, string, L, Ls, Ss, Ms>

    //custom
    fn: <R>(callback: (x: T) => R) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    fnRaw: <R>(callback: (x: TaskMessage<T>) => R) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    customFunction: <R>(callback: (x: T) => R) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    customAsyncFunction: <R>(callback: (x: T) => Promise<R>) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    customFunctionRaw: <R>(callback: (x: TaskMessage<T>) => R) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    customAsyncFunctionRaw: <R>(callback: (x: TaskMessage<T>) => Promise<R>) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    joinByKeyWithParallelism: (storage: Storage, keyFunction: (x: TaskMessage<T>) => string | number, parallelism: number) => TaskTypeHelper<I, T[], L, Ls, Ss, Ms>

    //queue
    queueSize: (storage: Storage) => TaskTypeHelper<I, number, L, Ls, Ss, Ms> // to check if it's really a number
    enqueue: (storage: Storage) => TaskTypeHelper<I, number, T, Ls, Ss, Ms> 
    dequeue: <R = any>(storage: Storage) => TaskTypeHelper<I, R, T, Ls, Ss, Ms>  // R is expected result

    //storage (only when Ss is true)
    withStorage: (storage: Storage) => TaskTypeHelper<I, T, L, Ls, true, Ms>
    toStorage: Ss extends false ? never : (keyFunc: (x: TaskMessage<T>) => string | number, valueFunc?: (x: T) => any, ttl?: number) => TaskTypeHelper<I, T, L, Ls, Ss, Ms> /*To check*/
    // fromStorage is in TaskOfArray
    fromStorageToGlobalState: Ss extends false ? never : (keysFunc: (x: TaskMessage<T>) => (string | number)[]) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    disconnectStorage: Ss extends false ? never : () => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    flushStorage: Ss extends false ? never : () => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    storage: Ss extends false ? never : () => Storage

    //local storage (only when Ls is true)
    withLocalKVStorage: <newL = any>() => TaskTypeHelper<I, T, newL, true, Ss, Ms> // define the type of items stored in storage keys
    setLocalKV: Ls extends false ? never : (key: string | number, func: (x: T) => L) => TaskTypeHelper<I, T, L, Ls, Ss, Ms> //sets local KV storage type {[x in string | number]: newL}
    getLocalKV: Ls extends false ? never : <K>(key?: K) => K extends Exclude<K, string | number> // check if key is provided
        ? TaskTypeHelper<I, { [x in string | number]: L }, L, Ls, Ss, Ms> // not provided => returns full storage
        : TaskTypeHelper<I, L, L, Ls, Ss, Ms> // provided => returns single storage value
    mergeLocalKV: Ls extends false ? never : <K extends string | number>(key: K) => TaskTypeHelper<I, T & { [x in K]: L }, L, Ls, Ss, Ms> 
    flushLocalKV: Ls extends false ? never : (key: string | number) => TaskTypeHelper<I, T, L, Ls, Ss, Ms> 

    //window (returned type to be checked)
    tumblingWindowCount: (storage: Storage, countLength: number, inactivityMilliseconds: number) => TaskTypeHelper<I, T[], L, Ls, Ss, Ms>
    tumblingWindowTime: (storage: Storage, timeLengthMilliSeconds: number, inactivityMilliseconds?: number) => TaskTypeHelper<I, T[], L, Ls, Ss, Ms>
    sessionWindowTime: (storage: Storage, inactivityMilliseconds: number) => TaskTypeHelper<I, T[], L, Ls, Ss, Ms>
    slidingWindowCount: (storage: Storage, countLength: number, slidingLength: number, inactivityMilliseconds: number) => TaskTypeHelper<I, T[], L, Ls, Ss, Ms>
    slidingWindowTime: (storage: Storage, timeLengthMilliSeconds: number, slidingLengthMilliseconds: number, inactivityMilliseconds: number) => TaskTypeHelper<I, T[], L, Ls, Ss, Ms>

    //sources
    fromArray: <R>(array: R[]) => TaskTypeHelper<I, R[], L, Ls, Ss, Ms>
    fromObject: <R>(object: R) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    fromString: (string: string) => TaskTypeHelper<I, string, L, Ls, Ss, Ms>
    fromInterval: <R = number>(intervalMs: number, generatorFunc?: (counter: number) => R, maxSize?: number) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>/*TBD*/
    fromReadableStream: (filePath: fs.PathLike, useZlib?: boolean) => TaskTypeHelper<I, fs.ReadStream, L, Ls, Ss, Ms>

    //kafka 
    toKafka: (kafkaSink: KSink, topic: string, callback?: (x: T) => Kafka.Message[], options?: KSinkOptions) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    fromKafka: <R = any>(source: KSource) => TaskTypeHelper<I, KMessage<R>, L, Ls, Ss, Ms>
    kafkaCommit: (kafkaSource: KSource, commitParams: KCommitParams) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
 
    //pulsar
    fromPulsar: (source: PlsSource) => TaskTypeHelper<I, Pulsar.Message, L, Ls, Ss, Ms>
    toPulsar: (sink: PlsSink, keyCb: (x: T) => any /*TBD*/, dataCb: (x: T) => any) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    flushPulsar: (sink: PlsSink) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>,
    toPulsarWs: (sink: PlsWsSink, keyCb: (x: T) => any /*TBD*/, dataCb: (x: T) => any) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>,
    parsePulsar: <R = any>(parseWith?: (x: string) => R) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>,
    ackPulsar: (sink: PlsSource) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>,
    fromPulsarWs: never, // not implemented

    //nats
    fromNats: <R = any>(source: NatsJsSource) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>,
    toNats: (sink: Nats.NatsConnection, topic: string, dataCb: (x: T) => any) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>,

    inject: (data: I) => Promise<TaskTypeHelper<I, T, L, Ls, Ss, Ms>>
    close: () => Promise<TaskTypeHelper<I, T, L, Ls, Ss, Ms>>
    finalize: <R = T>() => R
    self: (cb: (task: TaskTypeHelper<I, T, L, Ls, Ss, Ms>) => any) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>

    [x: string]: any
}

export declare interface TaskOfArray<I, T extends any[], L, Ls extends boolean, Ss extends boolean, Ms extends boolean> extends TaskOfObject<I, T, L, Ls, Ss, Ms> {
    map: <R>(func: (x: ElemOfArr<T>) => R) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    each: (func: (x: ElemOfArr<T>) => any) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    filterArray: (func: (x: ElemOfArr<T>) => boolean) => TaskTypeHelper<I, T, L, Ls, Ss, Ms>
    reduce: <R>(func: (prev: ElemOfArr<T>, curr: ElemOfArr<T>, currIdx?: number) => R, initialValue?: R) => TaskTypeHelper<I, R, L, Ls, Ss, Ms>
    countInArray: (func: (x: ElemOfArr<T>) => string | number) => TaskTypeHelper<I, { [x in string | number]: number }, L, Ls, Ss, Ms>
    length: () => TaskTypeHelper<I, number, L, Ls, Ss, Ms>
    groupBy: (func: (elem: T, index?: number, array?: T[]) => any) => TaskTypeHelper<I, { [x in string | number]: T[] }, L, Ls, Ss, Ms> 
    flat: () => TaskTypeHelper<I, ElemOfArr<ElemOfArr<T>>[], L, Ls, Ss, Ms>

    // it seems that fromStorage is available only if the message payload value is an array
    // since it pushes the stored values into the message payload
    fromStorage: Ss extends false ? never : (keysFunc: (x: TaskMessage<T>) => (string | number)[]) => TaskTypeHelper<I, any, L, Ls, Ss, Ms> /*To check*/
    [x: string]: any
}

export declare interface TaskOfObject<I, T, L, Ls extends boolean, Ss extends boolean, Ms extends boolean> extends TaskBase<I, T, L, Ls, Ss, Ms> {
    //sumMap should belong to an hypothetical TaskOfObjectOfArrays or TaskOfObjectOfStrings type (because it sums fields lenghts)
    sumMap: () => TaskTypeHelper<I, { [x in keyof T]: number }, L, Ls, Ss, Ms>
    objectGroupBy: (keyFunction: (x: T) => string | number) => TaskTypeHelper<I, { [x in string | number]: T[] }, L, Ls, Ss, Ms>
    aggregate: <R = T>(storage: Storage, name: string, keyFunction: (x: T) => string | number) => TaskTypeHelper<I, { [x in string | number]: R[] }, L, Ls, Ss, Ms>

    [x: string]: any
}

export declare interface TaskOfNumberArray<I, T extends number[], L, Ls extends boolean, Ss extends boolean, Ms extends boolean> extends TaskOfArray<I, T, L, Ls, Ss, Ms> {
    sum: () => TaskTypeHelper<I, number, L, Ls, Ss, Ms>    
}

export declare interface TaskOfStringArray<I, T extends string[], L, Ls extends boolean, Ss extends boolean, Ms extends boolean> extends TaskOfArray<I, T, L, Ls, Ss, Ms> {
    // just in case it's needed
    // eg concat () => string
}

export declare interface TaskOfString<I, T extends string, L, Ls extends boolean, Ss extends boolean, Ms extends boolean> extends TaskOfObject<I, T, L, Ls, Ss, Ms> {
    tokenize: () => TaskTypeHelper<I, string[], L, Ls, Ss, Ms>
}

export type TaskExtension<T, U extends any[]> = (first: T, ...rest: U) => void;

export declare function Task<I = any>(id?: any): TaskTypeHelper<I, I, void, false, false, false> /*TBD*/
export declare function ExtendTask(name: string, extension: TaskExtension<any, any>): void // can't be more specific :(
export declare function ExtendTaskRaw(name: string, extension: TaskExtension<TaskMessage<any>, any>): void

/* STORAGE */

export enum StorageKind {
    Memory = "Memory",
    Redis = "Redis",
    Cassandra = "Cassandra",
    Etcd = "Etcd",
    Opensearch = "Opensearch",
    Postgres = "Postgres"
}

// from IOptions.node
export type OpensearchNode = string | string[] | Opensearch.NodeOptions | Opensearch.NodeOptions[]

export type StorageConfig<K extends StorageKind> = K extends StorageKind.Memory
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

export declare interface Storage {
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

export declare function MakeStorage<K extends StorageKind>(kind: K, config?: StorageConfig<K>, id?: string | number): Storage
export declare function ExposeStorageState(storageMap: { [x in string | number]: Storage }, config?: { port?: number }): void

/* KAFKA */

export declare interface KMessage<T> {
    topic: string, 
    offset: number,
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

type KSinkOptions = { 
    compressionType: KCompressionType
}

type KCommitParams = Pick<Kafka.TopicPartitionOffsetAndMetadata, 'topic' | 'partition' | 'offset'>

export declare interface KSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => Kafka.Consumer
}

export declare interface KSink extends Kafka.Producer {}

export type RekeyFunction = (s: any) => any /*TBD*/
export type SinkDataFunction = (s: any) => Kafka.Message /*TBD*/

type ExchangeEmitTask = TaskTypeHelper<
    { key: string | number, value: string }, 
    { key: string | number, value: string }, 
    void, false, false, false
>

export declare interface KExchange<T> {
    setKeyParser: (fn: (x: T) => string | number) => void;
    setValidationFunction: (fn: (x: T) => boolean | any) => void;
    on: <R>(fn: (x: T) => R) => Promise<TaskTypeHelper<void, R, T, true, false, false>>;
    emit: (mex: any) => Promise<ExchangeEmitTask>
}

export declare function KafkaClient(config: Kafka.KafkaConfig): Kafka.Kafka
export declare function KafkaAdmin(client: Kafka.Kafka): Promise<Kafka.Admin>
export declare function KafkaSource(client: Kafka.Kafka, config: Kafka.ConsumerConfig): Promise<KSource>
export declare function KafkaSink(client: Kafka.Kafka, config: Kafka.ProducerConfig): Promise<KSink>
export declare function KafkaCommit(source: KSource, params: KCommitParams): Promise<KCommitParams>
export declare function KafkaRekey(kafkaSource: KSource, rekeyFunction: RekeyFunction, kafkaSink: KSink, sinkTopic: string, sinkDataFunction: SinkDataFunction): void
export declare function Exchange<T = any>(client: Kafka.Kafka, topic: string, groupId: string, sourceOptions?: Kafka.ConsumerConfig, sinkOptions?: Kafka.ProducerConfig): KExchange<T>

/* PULSAR */

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

/* NATS */
 
export declare interface NatsJsSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => void
}

export declare function NatsClient(server: Nats.ConnectionOptions): Promise<Nats.NatsConnection>
export declare function NatsJetstreamSource(natsCliens: Nats.NatsConnection, sources: Nats.ConsumerConfig[]): Promise<NatsJsSource>

type ElemOfArr<T extends any[]> = T extends (infer U)[] ? U : never;
// =======
// export const Task: typeof task;
// export const Exchange: typeof exchange;
// export const ExtendTask: typeof ExtendTaskSet;
// export const ExtendTaskRaw: typeof ExtendTaskSetRaw;
// export const MakeStorage: typeof storageMake;
// export const StorageKind: {
//     Memory: string;
//     Redis: string;
//     Cassandra: string;
//     Opensearch: string;
//     Postgres: string;
//     Etcd: string;
// };
// export const ExposeStorageState: typeof exposeStorageState;
// export const KafkaClient: typeof kafkaClient;
// export const KafkaAdmin: typeof kafkaAdmin;
// export const KafkaSource: typeof kafkaSource;
// export const KafkaSink: typeof kafkaSink;
// export const KafkaRekey: typeof kafkaRekey;
// export const KafkaCommit: typeof kafkaCommit;
// export const TumblingWindowTime: typeof tumblingWindowTime;
// export const TumblingWindowCount: typeof tumblingWindowCount;
// export const SlidingWindowTime: typeof slidingWindowTime;
// export const SlidingWindowCount: typeof slidingWindowCount;
// export const SessionWindow: typeof sessionWindow;
// export const SourceOperators: typeof sourceOperators;
// export const BaseOperators: typeof baseOperators;
// export const WindowOperators: typeof windowOperators;
// export const ArrayOperators: typeof arrayOperators;
// export const CustomOperators: typeof customOperators;
// export const SinkOperators: typeof sinkOperators;
// import task from "./src/task/task.js";
// import exchange from "./src/exchange/exchange.js";
// import { set as ExtendTaskSet } from "./src/task/extend.js";
// import { setRaw as ExtendTaskSetRaw } from "./src/task/extend.js";
// import { Make as storageMake } from "./src/storage/interface.js";
// import { ExposeStorageState as exposeStorageState } from "./src/rest/state.js";
// import kafkaClient from "./src/kafka/client.js";
// import kafkaAdmin from "./src/kafka/admin.js";
// import kafkaSource from "./src/kafka/source.js";
// import kafkaSink from "./src/kafka/sink.js";
// import kafkaRekey from "./src/kafka/rekey.js";
// import kafkaCommit from "./src/kafka/commit.js";
// import tumblingWindowTime from "./src/window/tumblingWindowTime.js";
// import tumblingWindowCount from "./src/window/tumblingWindowCount.js";
// import slidingWindowTime from "./src/window/slidingWindowTime.js";
// import slidingWindowCount from "./src/window/slidingWindowCount.js";
// import sessionWindow from "./src/window/windowSession.js";
// import * as sourceOperators from "./src/operators/source.js";
// import * as baseOperators from "./src/operators/base.js";
// import * as windowOperators from "./src/operators/window.js";
// import * as arrayOperators from "./src/operators/array.js";
// import * as customOperators from "./src/operators/custom.js";
// import * as sinkOperators from "./src/operators/sink.js";
// >>>>>>> master
