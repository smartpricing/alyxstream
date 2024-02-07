import { Kafka, ConsumerConfig, ProducerConfig, KafkaConfig, Admin, Consumer, Producer, CompressionTypes, Message, TopicPartitionOffsetAndMetadata } from "kafkajs"
import { ReadStream, PathLike } from "fs"

// T = current value type
// I = initial value type (needed for the "inject" method)
// L = type of local storage properties (void by default)
// Ls = is local storage set (false by default)

type TaskTypeHelper<I, T, L, Ls extends true | false> = T extends (infer U)[] // is T an array?
/**/ ? U extends number // array
/**//**/ ? TaskOfNumberArray<I, U[], L, Ls> // array of numbers
/**//**/ : U extends string // not array of numbers
/**//**//**/ ? TaskOfStringArray<I, U[], L, Ls> // array of strings
/**//**//**/ : U extends any[] // array of anything else
/**//**//**//**/ ? TaskOfMultiArray<I, U[], L, Ls> // n dimensions array
/**//**//**//**/ : TaskOfArray<I, U[], L, Ls> // 1 dimension array
/**/ : T extends string // not an array
/**//**/ ? TaskOfString<I, T, L, Ls> // string
/**//**/ : TaskOfObject<I, T, L, Ls> // anything else
// since everything in js is an object, TaskOfObject is the default

export declare interface TaskBase<I, T, L, Ls extends true | false> {
    //base
    withMetadata: Function/*TBD*/
    setMetadata: Function/*TBD*/
    getMetadata: Function/*TBD*/

    withDefaultKey: Function/*TBD*/
    withEventTime: Function/*TBD*/
    keyBy: Function/*TBD*/

    filter: Function/*TBD*/
    print: Function/*TBD*/

    branch: Function/*TBD*/
    readline: Function/*TBD*/

    //custom
    fn: <R>(callback: (x: T) => R) => TaskTypeHelper<I, R, L, Ls> /*TO CHECK*/
    fnRaw: Function/*TBD*/
    customFunction: Function/*TBD*/
    customAsyncFunction: Function/*TBD*/
    customFunctionRaw: Function/*TBD*/
    customAsyncFunctionRaw: Function/*TBD*/
    joinByKeyWithParallelism: Function/*TBD*/

    //queue
    queueSize: Function/*TBD*/
    enqueue: Function/*TBD*/
    dequeue: Function/*TBD*/

    //storage
    withStorage: Function/*TBD*/
    toStorage: Function/*TBD*/
    fromStorage: Function/*TBD*/
    fromStorageToGlobalState: Function/*TBD*/
    disconnectStorage: Function/*TBD*/
    flushStorage: Function/*TBD*/
    storage: Function/*TBD*/

    //local storage (only when Ls = true)
    withLocalKVStorage: <newL = any>() => TaskTypeHelper<I, T, newL, true> // define the type of items stored in storage keys
    setLocalKV: Ls extends false ? never : (key: string | number, func: (x: T) => L) => TaskTypeHelper<I, T, L, Ls> //sets local KV storage type {[x in string | number]: newL}
    getLocalKV: Ls extends false ? never : <K>(key?: K) => K extends Exclude<K, string | number> // check if key is provided
        ? TaskTypeHelper<I, { [x in string | number]: L }, L, Ls> // not provided => returns full storage
        : TaskTypeHelper<I, L, L, Ls> // provided => returns single storage value
    mergeLocalKV: Ls extends false ? never : <K extends string | number>(key: K) => TaskTypeHelper<I, T & { [x in K]: L }, L, Ls> 
    flushLocalKV: Ls extends false ? never : (key: string | number) => TaskTypeHelper<I, T, L, Ls> 

    //window
    tumblingWindowCount: Function/*TBD*/
    tumblingWindowTime: Function/*TBD*/
    sessionWindowTime: Function/*TBD*/
    slidingWindowCount: Function/*TBD*/
    slidingWindowTime: Function/*TBD*/

    //sink 
    toKafka: (kafkaSink: KSink, topic: string, callback?: (x: T) => Message[], options?: KSinkOptions) => TaskTypeHelper<I, T, L, Ls>
    kafkaCommit: (kafkaSource: KSource, commitParams: KCommitParams) => TaskTypeHelper<I, T, L, Ls>
 
    //source
    fromKafka: <R = any>(source: KSource) => TaskTypeHelper<I, KMessage<R>, L, Ls>
    fromArray: <R>(array: R[]) => TaskTypeHelper<I, R[], L, Ls>
    fromObject: <R>(object: R) => TaskTypeHelper<I, R, L, Ls>
    fromString: (string: string) => TaskTypeHelper<I, string, L, Ls>
    fromInterval: <R = number>(intervalMs: number, generatorFunc?: (counter: number) => R, maxSize?: number) => TaskTypeHelper<I, R, L, Ls>/*TBD*/
    fromReadableStream: (filePath: PathLike, useZlib?: boolean) => TaskTypeHelper<I, ReadStream, L, Ls>

    inject: (data: I) => Promise<TaskTypeHelper<I, T, L, Ls>>
    close: () => Promise<TaskTypeHelper<I, T, L, Ls>>

    [x: string]: any 
}

export declare interface TaskOfArray<I, T extends any[], L, Ls extends true | false> extends TaskOfObject<I, T, L, Ls> {
    map: <R>(func: (x: ElemOfArr<T>) => R) => TaskTypeHelper<I, R, L, Ls>
    each: Function/*TBD*/ //bug? the callback is never called
    filterArray: (func: (x: ElemOfArr<T>) => boolean) => TaskTypeHelper<I, T, L, Ls>
    reduce: <R>(func: (prev: ElemOfArr<T>, curr: ElemOfArr<T>, currIdx?: number) => R, initialValue?: R) => TaskTypeHelper<I, R, L, Ls>
    countInArray: Function/*TBD*/ //*???
    length: () => TaskTypeHelper<I, number, L, Ls>
    groupBy: (func: (elem: T, index: number, array: T[]) => any) => TaskTypeHelper<I, { [x in string | number]: T[] }, L, Ls> // TO CHECK

    [x: string]: any
}

export declare interface TaskOfMultiArray<I, T extends any[][], L, Ls extends true | false> extends TaskOfArray<I, T, L, Ls> {
    flat: () => TaskTypeHelper<I, ElemOfArr<ElemOfArr<T>>[], L, Ls>
    
    [x: string]: any
}

export declare interface TaskOfObject<I, T, L, Ls extends true | false> extends TaskBase<I, T, L, Ls> {
    sumMap: Function/*TBD*/
    objectGroupBy: Function/*TBD*/
    aggregate: Function/*TBD*/

    [x: string]: any
}

export declare interface TaskOfNumberArray<I, T extends number[], L, Ls extends true | false> extends TaskOfArray<I, T, L, Ls> {
    sum: () => TaskTypeHelper<I, number, L, Ls>    
}

export declare interface TaskOfStringArray<I, T extends string[], L, Ls extends true | false> extends TaskOfArray<I, T, L, Ls> {
    // just in case it's needed
    // eg concat () =>
}

export declare interface TaskOfString<I, T extends string, L, Ls extends true | false> extends TaskOfObject<I, T, L, Ls> {
    tokenize: () => TaskTypeHelper<I, string[], L, Ls>
}

export declare function Task<I = any>(id?: any): TaskTypeHelper<I, I, void, false> /*TBD*/
export declare function ExtendTask(name: string, extension: any /*TBD*/): void
export declare function ExtendTaskRaw(name: string, extension: any /*TBD*/): void

export enum StorageKind {
    Memory = "memory",
    Redis = "redis",
    Cassandra = "cassandra",
}

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

export declare function MakeStorage(kind: StorageKind, config?: any/*TBD*/, id?: any /*TBD*/): Storage
export declare function ExposeStorageState(storageMap: any /*TBD*/, config: any /*TBD*/): void

export declare interface KMessage<T> {
    topic: string, 
    offset: number,
    partition: number, 
    headers: any, /*TBD*/
    key: string,
    value: T
}

type KCompressionType = 
    CompressionTypes.GZIP |
    CompressionTypes.LZ4 |
    CompressionTypes.None |
    CompressionTypes.Snappy |
    CompressionTypes.ZSTD 

type KSinkOptions = { 
    compressionType: KCompressionType
}

type KCommitParams = Pick<TopicPartitionOffsetAndMetadata, 'topic' | 'partition' | 'offset'>

export declare interface KSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => Consumer
}

export declare interface KSink extends Producer {}

export type RekeyFunction = (s: any) => any /*TBD*/
export type SinkDataFunction = (s: any) => Message /*TBD*/

export declare interface KExchange<T> {
    setKeyParser: (fn: (x: T) => string | number) => void;
    setValidationFunction: (fn: (x: T) => boolean | any) => void;
    on: <R>(fn: (x: T) => R) => Promise<TaskTypeHelper<void, R, void, false>>; /*TBD*/
    emit: (mex: any) => Promise<any>;/*TBD*/
}

export declare function KafkaClient(config: KafkaConfig): Kafka
export declare function KafkaAdmin(client: Kafka): Promise<Admin>
export declare function KafkaSource(client: Kafka, config: ConsumerConfig): Promise<KSource>
export declare function KafkaSink(client: Kafka, config: ProducerConfig): Promise<KSink>
export declare function KafkaCommit(source: KSource, params: KCommitParams): Promise<KCommitParams>
export declare function KafkaRekey(kafkaSource: KSource, rekeyFunction: RekeyFunction, kafkaSink: KSink, sinkTopic: string, sinkDataFunction: SinkDataFunction): void
export declare function Exchange<T = any>(client: Kafka, topic: string, groupId: string, sourceOptions?: ConsumerConfig, sinkOptions?: ProducerConfig): KExchange<T>

type ElemOfArr<T extends any[]> = T extends (infer U)[] ? U : never;

// type OptionalParameterFunction<P, A, B> = {
//     <K extends P>(key?: K): ExactlyMatches<typeof key, undefined> extends true ? A : B;
// };

// type ExactlyMatches<A, B> = A extends B ? (B extends A ? true : false) : false;
