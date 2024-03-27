'use strict'

import express from 'express'

import { RestDefaultConfig } from '../config/rest.js'

export function ExposeStorageState (storageMap, config = {}) {
  const app = express()

  Object.keys(storageMap).forEach((prefix) => {
    app.get('/api/v1/state/:prefix/:keys', async function (req, res) {
      if (storageMap[req.params.prefix] === undefined) {
        res.sendStatus(404)
        return
      }
      const keys = req.params.keys.split(',')
      const response = []
      for (const key of keys) {
        response.push(await storageMap[req.params.prefix].get(key))
      }
      res.json(response)
    })
  })

  app.listen(config.port || RestDefaultConfig.port)
}
