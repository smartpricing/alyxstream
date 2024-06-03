'use strict'

export function Make (config, id) {
  return {
    state: {},
    _id: id,

    db: async function () {
      return this.state
    },

    _composeKey: function (key) {
      return this._id + '.' + key
    },
    _composeMetadataKey: function (key) {
      return this._id + '.' + key + '.metadata'
    },

    set: async function (key, value) {
      this.state[this._composeKey(key)] = value
    },

    get: async function (key, value) {
      return this.state[this._composeKey(key)]
    },

    push: async function (key, metadata, value) {
      if (this.state[this._composeKey(key)] === undefined) {
        this.state[this._composeKey(key)] = []
      }
      
      this.state[this._composeKey(key)].push(value)
      this.state[this._composeMetadataKey(key)] = metadata
    },

    getMetadata: async function (key) {
      try {
        const meta = this.state[this._composeMetadataKey(key)]
        return meta === undefined ? null : meta
      } catch (e) {
        return null
      }
    },

    setMetadata: async function (key, metadata) {
      try {
        this.state[this._composeMetadataKey(key)] = metadata
        return null
      } catch (e) {
        return e
      }
    },

    getList: async function (key) {
      try {
        return this.state[this._composeKey(key)]
      } catch (e) {
        return null
      }
    },

    sliceCountAndGet: async function (key, sliceSize) {
      try {
        this.state[this._composeKey(key)] = this.state[this._composeKey(key)].slice(sliceSize)
        return this.state[this._composeKey(key)]
      } catch (e) {
        return e
      }
    },

    sliceTime: async function (key, sliceSize) {
      try {
        const elements = this.state[this._composeKey(key)]
        for (let i = 0; i < elements.length; i += 1) {
          if ((new Date(elements[i].eventTime).getTime()) >= sliceSize) {
            this.state[this._composeKey(key)] = this.state[this._composeKey(key)].slice(i + 1)
            break
          }
        }
        return null
      } catch (e) {
        return e
      }
    },

    flush: async function (key, value) {
      try {
        delete this.state[this._composeKey(key)]
        delete this.state[this._composeMetadataKey(key)]
        return null
      } catch (error) {
        return error
      }
    },

    flushWindow: async function (key, value) {
      delete this.state[this._composeKey(key)]
      return null
    },

    disconnect: async function () {}
  }
}
