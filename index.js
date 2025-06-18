'use strict'

/** ----------------------------------
 *  API
*/

/** Task */
import task from './src/task/task.js'

/** Exchange */
import exchange from './src/exchange/exchange.js'

import { set as ExtendTaskSet, setRaw as ExtendTaskSetRaw } from './src/task/extend.js'

/** Storage */
import { Make as storageMake, Kind as storageKind } from './src/storage/interface.js'

/** State Rest */
import { ExposeStorageState as exposeStorageState } from './src/rest/state.js'

/** Kafka things */
import kafkaClient from './src/kafka/client.js'
import kafkaAdmin from './src/kafka/admin.js'
import kafkaSource from './src/kafka/source.js'
import kafkaSink from './src/kafka/sink.js'
import kafkaRekey from './src/kafka/rekey.js'
import kafkaCommit from './src/kafka/commit.js'

/** Nats things */
import natsClient from './src/nats/client.js'
import natsSourceJetstream from './src/nats/source-jetstream.js'

/** ----------------------------------
 *  Building blocks
 *
 *  you should not use these directly
*/

/** Windows */
import tumblingWindowTime from './src/window/tumblingWindowTime.js'
import tumblingWindowCount from './src/window/tumblingWindowCount.js'
import sessionWindow from './src/window/windowSession.js'
import slidingWindowTime from './src/window/slidingWindowTime.js'
import slidingWindowCount from './src/window/slidingWindowCount.js'

/** Operators */
import * as sourceOperators from './src/operators/source.js'
import * as baseOperators from './src/operators/base.js'
import * as windowOperators from './src/operators/window.js'
import * as arrayOperators from './src/operators/array.js'
import * as customOperators from './src/operators/custom.js'
import * as sinkOperators from './src/operators/sink.js'
export const Task = task
export const Exchange = exchange
export const ExtendTask = ExtendTaskSet
export const ExtendTaskRaw = ExtendTaskSetRaw
export const MakeStorage = storageMake
export const StorageKind = storageKind
export const ExposeStorageState = exposeStorageState
export const KafkaClient = kafkaClient
export const KafkaAdmin = kafkaAdmin
export const KafkaSource = kafkaSource
export const KafkaSink = kafkaSink
export const KafkaRekey = kafkaRekey
export const KafkaCommit = kafkaCommit
export const NatsClient = natsClient
export const NatsJetstreamSource = natsSourceJetstream
export const TumblingWindowTime = tumblingWindowTime
export const TumblingWindowCount = tumblingWindowCount
export const SlidingWindowTime = slidingWindowTime
export const SlidingWindowCount = slidingWindowCount
export const SessionWindow = sessionWindow
export const SourceOperators = sourceOperators
export const BaseOperators = baseOperators
export const WindowOperators = windowOperators
export const ArrayOperators = arrayOperators
export const CustomOperators = customOperators
export const SinkOperators = sinkOperators
