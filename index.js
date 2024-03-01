'use strict'

/** ----------------------------------
 *  API
*/

/** Task */
import task from './src/task/task.js'
export const Task = task

/** Exchange */
import exchange from './src/exchange/exchange.js'
export const Exchange = exchange

import { set as ExtendTaskSet, setRaw as ExtendTaskSetRaw } from './src/task/extend.js'
export const ExtendTask = ExtendTaskSet
export const ExtendTaskRaw = ExtendTaskSetRaw

/** Storage */
import { Make as storageMake, Kind as storageKind } from './src/storage/interface.js'
export const MakeStorage = storageMake
export const StorageKind = storageKind

/** State Rest */
import { ExposeStorageState as exposeStorageState } from './src/rest/state.js'
export const ExposeStorageState = exposeStorageState

/** Kafka things */
import kafkaClient from './src/kafka/client.js'
import kafkaAdmin from './src/kafka/admin.js'
import kafkaSource from './src/kafka/source.js'
import kafkaSink from './src/kafka/sink.js'
import kafkaRekey from './src/kafka/rekey.js'
import kafkaCommit from './src/kafka/commit.js'
export const KafkaClient = kafkaClient
export const KafkaAdmin = kafkaAdmin
export const KafkaSource = kafkaSource
export const KafkaSink = kafkaSink
export const KafkaRekey = kafkaRekey
export const KafkaCommit = kafkaCommit

/** Pulsar things */
import pulsarClient from './src/pulsar/client.js'
import pulsarSource from './src/pulsar/source.js'
import pulsarSourceWs from './src/pulsar/source-ws.js'
import pulsarSink from './src/pulsar/sink.js'
import pulsarSinkWs from './src/pulsar/sink-ws.js'
export const PulsarClient = pulsarClient
export const PulsarSource = pulsarSource
export const PulsarSourceWs = pulsarSourceWs
export const PulsarSink = pulsarSink
export const PulsarSinkWs = pulsarSinkWs

/** Nats things */
import natsClient from './src/nats/client.js'
import natsSourceJetstream from './src/nats/source-jetstream.js'
export const NatsClient = natsClient
export const NatsJetstreamSource = natsSourceJetstream

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
export const TumblingWindowTime = tumblingWindowTime
export const TumblingWindowCount = tumblingWindowCount
export const SlidingWindowTime = slidingWindowTime
export const SlidingWindowCount = slidingWindowCount
export const SessionWindow = sessionWindow

/** Operators */
import * as sourceOperators from './src/operators/source.js'
import * as baseOperators   from './src/operators/base.js'
import * as windowOperators from './src/operators/window.js'
import * as arrayOperators  from './src/operators/array.js'
import * as customOperators from './src/operators/custom.js'
import * as sinkOperators from './src/operators/sink.js'
export const SourceOperators = sourceOperators
export const BaseOperators   = baseOperators
export const WindowOperators = windowOperators
export const ArrayOperators  = arrayOperators
export const CustomOperators = customOperators
export const SinkOperators = sinkOperators

