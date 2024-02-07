import { Kafka, ConsumerConfig, ProducerConfig, KafkaConfig, Admin, Consumer, Producer, CompressionTypes, Message, TopicPartitionOffsetAndMetadata } from "kafkajs"
import { ReadStream, PathLike } from "fs"

// T = current value type
// I = initial value type (needed for the "inject" method)

type TaskTypeHelper<I, T> = T extends (infer U)[] // is T an array?
/**/ ? U extends number // array
/**//**/ ? TaskOfNumberArray<I, U[]> // array of numbers
/**//**/ : U extends string // not array of numbers
/**//**//**/ ? TaskOfStringArray<I, U[]> // array of strings
/**//**//**/ : U extends any[] // array of anything else
/**//**//**//**/ ? TaskOfMultiArray<I, U[]> // n dimensions array
/**//**//**//**/ : TaskOfArray<I, U[]> // 1 dimension array
/**/ : T extends string // not an array
/**//**/ ? TaskOfString<I, T> // string
/**//**/ : TaskOfObject<I, T> // anything else
// since everything in js is an object, TaskOfObject is the default

export declare interface TaskBase<I, T> {
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
    fn: <R>(callback: (x: T) => R) => TaskTypeHelper<I, R> /*TO CHECK*/
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

    //window
    tumblingWindowCount: Function/*TBD*/
    tumblingWindowTime: Function/*TBD*/
    sessionWindowTime: Function/*TBD*/
    slidingWindowCount: Function/*TBD*/
    slidingWindowTime: Function/*TBD*/

    //sink 
    toKafka: (kafkaSink: KSink, topic: string, callback?: (x: T) => Message[], options?: KSinkOptions) => TaskTypeHelper<I, T>
    kafkaCommit: (kafkaSource: KSource, commitParams: KCommitParams) => TaskTypeHelper<I, T>
 
    //source
    fromKafka: <R = any>(source: KSource) => TaskTypeHelper<I, KMessage<R>>
    fromArray: <R>(array: R[]) => TaskTypeHelper<I, R[]>
    fromObject: <R>(object: R) => TaskTypeHelper<I, R>
    fromString: (string: string) => TaskTypeHelper<I, string>
    fromInterval: <R = number>(intervalMs: number, generatorFunc?: (counter: number) => R, maxSize?: number) => TaskTypeHelper<I, R>/*TBD*/
    fromReadableStream: (filePath: PathLike, useZlib?: boolean) => TaskTypeHelper<I, ReadStream>

    inject: (data: I) => Promise<TaskTypeHelper<I, T>>
    close: () => Promise<TaskTypeHelper<I, T>>

    [x: string]: any 
}

export declare interface TaskOfArray<I, T extends any[]> extends TaskOfObject<I, T> {
    map: <R>(func: (x: ElemOfArr<T>) => R) => TaskTypeHelper<I, R>
    each: Function/*TBD*/ //bug? the callback is never called
    filterArray: (func: (x: ElemOfArr<T>) => boolean) => TaskTypeHelper<I, T>
    reduce: <R>(func: (prev: ElemOfArr<T>, curr: ElemOfArr<T>, currIdx?: number) => R, initialValue?: R) => TaskTypeHelper<I, R>
    countInArray: Function/*TBD*/ //*???
    length: () => TaskTypeHelper<I, number>
    groupBy: (func: (elem: T, index: number, array: T[]) => any) => TaskTypeHelper<I, { [x in string | number]: T[] }> // TO CHECK

    [x: string]: any
}

export declare interface TaskOfMultiArray<I, T extends any[][]> extends TaskOfArray<I, T>, TaskOfObject<I, T> {
    flat: () => TaskTypeHelper<I, ElemOfArr<ElemOfArr<T>>[]>
    
    [x: string]: any
}

export declare interface TaskOfObject<I, T> extends TaskBase<I, T> {
    sumMap: Function/*TBD*/
    objectGroupBy: Function/*TBD*/
    aggregate: Function/*TBD*/

    [x: string]: any
}

export declare interface TaskOfNumberArray<I, T extends number[]> extends TaskOfArray<I, T> {
    sum: () => TaskTypeHelper<I, number>    
}

export declare interface TaskOfStringArray<I, T extends string[]> extends TaskOfArray<I, T> {
    // just in case it's needed
    // eg concat () =>
}

export declare interface TaskOfString<I, T extends string> extends TaskOfObject<I, T> {
    tokenize: () => TaskTypeHelper<I, string>
}

export declare function Task<I = any>(id?: any): TaskTypeHelper<I, I> /*TBD*/
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

export declare interface Exch {
    setKeyParser: (fn: any) => any;/*TBD*/
    setValidationFunction: (fn: any) => any;/*TBD*/
    on: (fn: (x: any) => Promise<any>) => Promise<any>;/*TBD*/
    emit: (mex: any) => Promise<any>;/*TBD*/
}

export declare function KafkaClient(config: KafkaConfig): Kafka
export declare function KafkaAdmin(client: Kafka): Promise<Admin>
export declare function KafkaSource(client: Kafka, config: ConsumerConfig): Promise<KSource>
export declare function KafkaSink(client: Kafka, config: ProducerConfig): Promise<KSink>
export declare function KafkaCommit(source: KSource, params: KCommitParams): Promise<KCommitParams>
export declare function KafkaRekey(kafkaSource: KSource, rekeyFunction: RekeyFunction, kafkaSink: KSink, sinkTopic: string, sinkDataFunction: SinkDataFunction): void
export declare function Exchange(client: Kafka, topic: string, sourceOptions: ConsumerConfig, sinkOptions: ProducerConfig): Exch

type ElemOfArr<T extends any[]> = T extends (infer U)[] ? U : never;