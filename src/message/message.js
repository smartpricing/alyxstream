'use strict'

export default function (payload, metadata = {}, globalState = {}) {
	const message = {
		payload: payload,
		metadata: metadata,
		globalState: globalState
	}
	return message
}