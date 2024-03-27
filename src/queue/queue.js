'use strict'

export async function queueSize (storage) {
  return await storage.queueSize()
}

export async function enqueue (storage, data) {
  return await storage.enqueue(data)
}

export async function dequeue (storage) {
  return await storage.dequeue()
}
