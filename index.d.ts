import { Kafka, ConsumerConfig, ProducerConfig, KafkaConfig, Admin, Consumer, Producer, CompressionTypes, Message, TopicPartitionOffsetAndMetadata } from "kafkajs"
import { ReadStream, PathLike } from "fs"

// T = current value type
// I = initial value type (needed for the "inject" method)

type TaskTypeHelper<I, T, L> = T extends (infer U)[] // is T an array?
/**/ ? U extends number // array
/**//**/ ? TaskOfNumberArray<I, U[], L> // array of numbers
/**//**/ : U extends string // not array of numbers
/**//**//**/ ? TaskOfStringArray<I, U[], L> // array of strings
/**//**//**/ : U extends any[] // array of anything else
/**//**//**//**/ ? TaskOfMultiArray<I, U[], L> // n dimensions array
/**//**//**//**/ : TaskOfArray<I, U[], L> // 1 dimension array
/**/ : T extends string // not an array
/**//**/ ? TaskOfString<I, T, L> // string
/**//**/ : TaskOfObject<I, T, L> // anything else
// since everything in js is an object, TaskOfObject is the default

export declare interface TaskBase<I, T, L> {
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
    fn: <R>(callback: (x: T) => R) => TaskTypeHelper<I, R, L> /*TO CHECK*/
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

    //local storage
    withLocalKVStorage: <newL = any>() => TaskTypeHelper<I, T, newL>
    setLocalKV: (key: string | number, func: (x: T) => L) => TaskTypeHelper<I, T, L> //sets local KV storage type {[x in string | number]: newL}
    getLocalKV: <K>(key?: K) => K extends Exclude<K, string | number> // check if key is provided
        ? TaskTypeHelper<I, { [x in string | number]: L }, L> // not provided => returns full storage
        : TaskTypeHelper<I, L, L> // provided => returns single storage value
    mergeLocalKV: <K extends string | number>(key: K) => TaskTypeHelper<I, T & {[x in K]: L}, L> 
    flushLocalKV: (key: string | number) => TaskTypeHelper<I, T, L> 

    //window
    tumblingWindowCount: Function/*TBD*/
    tumblingWindowTime: Function/*TBD*/
    sessionWindowTime: Function/*TBD*/
    slidingWindowCount: Function/*TBD*/
    slidingWindowTime: Function/*TBD*/

    //sink 
    toKafka: (kafkaSink: KSink, topic: string, callback?: (x: T) => Message[], options?: KSinkOptions) => TaskTypeHelper<I, T, L>
    kafkaCommit: (kafkaSource: KSource, commitParams: KCommitParams) => TaskTypeHelper<I, T, L>
 
    //source
    fromKafka: <R = any>(source: KSource) => TaskTypeHelper<I, KMessage<R>, L>
    fromArray: <R>(array: R[]) => TaskTypeHelper<I, R[], L>
    fromObject: <R>(object: R) => TaskTypeHelper<I, R, L>
    fromString: (string: string) => TaskTypeHelper<I, string, L>
    fromInterval: <R = number>(intervalMs: number, generatorFunc?: (counter: number) => R, maxSize?: number) => TaskTypeHelper<I, R, L>/*TBD*/
    fromReadableStream: (filePath: PathLike, useZlib?: boolean) => TaskTypeHelper<I, ReadStream, L>

    inject: (data: I) => Promise<TaskTypeHelper<I, T, L>>
    close: () => Promise<TaskTypeHelper<I, T, L>>

    [x: string]: any 
}

export declare interface TaskOfArray<I, T extends any[], L> extends TaskOfObject<I, T, L> {
    map: <R>(func: (x: ElemOfArr<T>) => R) => TaskTypeHelper<I, R, L>
    each: Function/*TBD*/ //bug? the callback is never called
    filterArray: (func: (x: ElemOfArr<T>) => boolean) => TaskTypeHelper<I, T, L>
    reduce: <R>(func: (prev: ElemOfArr<T>, curr: ElemOfArr<T>, currIdx?: number) => R, initialValue?: R) => TaskTypeHelper<I, R, L>
    countInArray: Function/*TBD*/ //*???
    length: () => TaskTypeHelper<I, number, L>
    groupBy: (func: (elem: T, index: number, array: T[]) => any) => TaskTypeHelper<I, { [x in string | number]: T[] }, L> // TO CHECK

    [x: string]: any
}

export declare interface TaskOfMultiArray<I, T extends any[][], L> extends TaskOfArray<I, T, L>, TaskOfObject<I, T, L> {
    flat: () => TaskTypeHelper<I, ElemOfArr<ElemOfArr<T>>[], L>
    
    [x: string]: any
}

export declare interface TaskOfObject<I, T, L> extends TaskBase<I, T, L> {
    sumMap: Function/*TBD*/
    objectGroupBy: Function/*TBD*/
    aggregate: Function/*TBD*/

    [x: string]: any
}

export declare interface TaskOfNumberArray<I, T extends number[], L> extends TaskOfArray<I, T, L> {
    sum: () => TaskTypeHelper<I, number, L>    
}

export declare interface TaskOfStringArray<I, T extends string[], L> extends TaskOfArray<I, T, L> {
    // just in case it's needed
    // eg concat () =>
}

export declare interface TaskOfString<I, T extends string, L> extends TaskOfObject<I, T, L> {
    tokenize: () => TaskTypeHelper<I, string[], L>
}

export declare function Task<I = any>(id?: any): TaskTypeHelper<I, I, void> /*TBD*/
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
    on: <R>(fn: (x: T) => R) => Promise<TaskTypeHelper<void, R, any>>; /*TBD*/
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
