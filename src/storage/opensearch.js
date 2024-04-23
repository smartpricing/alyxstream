import { Client } from '@opensearch-project/opensearch'

export function Make (config, id) {
  const db = config ? new Client({ node: config }) : null
  return {
    _db: db,
    _id: id,

    db: function () {
      return this._db
    }
  }
}
