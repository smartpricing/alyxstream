import { Kafka, ConsumerConfig, ProducerConfig, KafkaConfig, Admin } from "kafkajs"

export declare interface TaskBase {
    //base
    withMetadata: Function/*TBD*/
    setMetadata: Function/*TBD*/
    getMetadata: Function/*TBD*/

    withDefaultKey: Function/*TBD*/
    withEventTime: Function/*TBD*/
    keyBy: Function/*TBD*/

    filter: Function/*TBD*/
    sum: Function/*TBD*/ //???
    tokenize: Function/*TBD*/
    print: Function/*TBD*/

    branch: Function/*TBD*/
    readline: Function/*TBD*/

    //custom
    fn: Function/*TBD*/
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
    toKafka: Function/*TBD*/
    kafkaCommit: Function/*TBD*/

    //source
    fromKafka: Function/*TBD*/
    fromArray: Function/*TBD*/
    fromObject: Function/*TBD*/
    fromString: Function/*TBD*/
    fromInterval: Function/*TBD*/
    fromReadableStream: Function/*TBD*/

    [x: string]: any 
}

export declare interface TaskOfArray {
    map: Function/*TBD*/
    each: Function/*TBD*/
    filterArray: Function/*TBD*/
    flat: Function/*TBD*/
    reduce: Function/*TBD*/
    countInArray: Function/*TBD*/ //*???
    length: Function/*TBD*/
    groupBy: Function/*TBD*/

    [x: string]: any
}

export declare interface TaskOfObject {
    sumMap: Function/*TBD*/
    objectGroupBy: Function/*TBD*/
    aggregate: Function/*TBD*/

    [x: string]: any
}

export declare function Task(id: any): TaskBase

export declare interface Exch {
    setKeyParser: (fn: any) => any;/*TBD*/
    setValidationFunction: (fn: any) => any;/*TBD*/
    on: (fn: (x: any) => Promise<any>) => Promise<any>;/*TBD*/
    emit: (mex: any) => Promise<any>;/*TBD*/
}

export declare function Exchange(client: Kafka, topic: string, sourceOptions: ConsumerConfig, sinkOptions: ProducerConfig): Exch

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

export declare function KafkaClient(config: KafkaConfig): Kafka
export declare function KafkaAdmin(client: Kafka): Promise<Admin>

// // // // // // // // // // // // 

export const KafkaSource: typeof kafkaSource;
export const KafkaSink: typeof kafkaSink;
export const KafkaRekey: typeof kafkaRekey;
export const KafkaCommit: typeof kafkaCommit;

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
import kafkaSource from "./src/kafka/source.js";
import kafkaSink from "./src/kafka/sink.js";
import kafkaRekey from "./src/kafka/rekey.js";
import kafkaCommit from "./src/kafka/commit.js";
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
// import * as sinkOperators from "./src/operators/sink.js";import { objectGroupBy } from "./src/operators/object.js"

