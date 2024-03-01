'use strict'

import { extensions } from './extend.js'
import Messagge from '../message/message.js'
import * as SourceOperators from '../operators/source.js'
import * as PulsarOperators from '../operators/pulsar.js'
import * as NatsOperators from '../operators/nats.js'
import * as SinkOperators from '../operators/sink.js'
import * as BaseOperators from '../operators/base.js'
import * as WindowOperators from '../operators/window.js'
import * as ArrayOperators from '../operators/array.js'
import * as ObjectOperators from '../operators/object.js'
import * as QueueOperators from '../operators/queue.js'
import * as CustomOperators from '../operators/custom.js'
import * as StorageOperators from '../operators/storage.js'
import * as LocalStorageOperators from '../task-storage/task-storage.js'
import * as ParallelProcess from '../parallel/process.js'


export default function (id) {
	let task = {
		id: id,
		_steps: [],
		_lastResult: null
	}

	task._nextIndex = () => task._steps.length + 1
	task._index = () => task._steps.length
	task._first = () => task._steps[0]
	task._last = () => task._steps[task._steps.length - 1]

	task._nextAtIndex = (index) => {
		if (index >= task._steps.length) {
			return async (element) => {
				task._lastResult = element				
			}
		}
		return task._steps[index]
	}

	task._setNext = (next) => {
		task._steps.push(next)
	}

	task.close = async () => {
		await task._first()()
		return task
	}

	task.inject = async (data) => {
		await task._first()(Messagge(data))
		return task
	}	

	task.finalize = () => {
		return task._lastResult
	}	

	task.self = (cb) => {
		cb(task)
		return task
	} 	

	Object.assign(
		task, 

		BaseOperators.withMetadata,
		BaseOperators.keyBy, 
		BaseOperators.withDefaultKey,
		BaseOperators.withEventTime,
		BaseOperators.print,
		BaseOperators.filter,
		BaseOperators.sum,
		BaseOperators.tokenize,
		BaseOperators.branch,
		BaseOperators.readline,

		ArrayOperators.map,
		ArrayOperators.groupBy,
		ArrayOperators.each,
		ArrayOperators.countInArray,
		ArrayOperators.flat,
		ArrayOperators.filterArray,
		ArrayOperators.reduce,
		ArrayOperators.length,	

		ObjectOperators.sumMap,
		ObjectOperators.aggregate,	
		ObjectOperators.objectGroupBy,

		CustomOperators.fn,
		CustomOperators.fnRaw,
		CustomOperators.customFunction,
		CustomOperators.customAsyncFunction,
		CustomOperators.customFunctionRaw,	
		CustomOperators.customAsyncFunctionRaw,
		CustomOperators.joinByKeyWithParallelism,

		QueueOperators.queueSize,
		QueueOperators.enqueue,
		QueueOperators.dequeue,
		QueueOperators.multiDequeue,

		StorageOperators.withStorage,	
		LocalStorageOperators.localStorage,

		SourceOperators.fromKafka,
		SourceOperators.fromArray,
		SourceOperators.fromObject,
		SourceOperators.fromString,
		SourceOperators.fromInterval,
		SourceOperators.fromReadableStream,

		SinkOperators.toKafka,
		SinkOperators.kafkaCommit,

		PulsarOperators.fromPulsar,
		PulsarOperators.flushPulsar,
		PulsarOperators.toPulsar,
		PulsarOperators.toPulsarWs,
		PulsarOperators.parsePulsar,
		PulsarOperators.ackPulsar,
		PulsarOperators.fromPulsarWs,	

		NatsOperators.fromNats,
		NatsOperators.toNats,

		WindowOperators.tumblingWindowTime,
		WindowOperators.tumblingWindowCount,
		WindowOperators.slidingWindowCount,
		WindowOperators.slidingWindowTime,
		WindowOperators.sessionWindowTime,

		ParallelProcess.parallel
	)

	Object.assign(task, extensions)

	return task
}
