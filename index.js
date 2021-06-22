/* eslint-env browser */

export class Cluster {
  /**
   * @param {URL|string} url Cluster HTTP API root URL.
   * @param {{ headers?: Record<string, string> }} [options]
   */
  constructor (url, options) {
    /**
     * @private
     * @readonly
     */
    this.url = new URL(url)
    /**
     * @private
     * @readonly
     */
    this.options = options || {}
  }

  /**
   * @param {File|Blob} file
   * @param {import('./index').AddParams} [options]
   * @returns {Promise<import('./index').AddResponse>}
   */
  async add (file, options) {
    if (!(file instanceof File) && !(file instanceof Blob)) {
      throw new Error('invalid file')
    }

    const body = new FormData()
    body.append('file', file, file.name)

    const url = new URL('add', this.url)
    url.searchParams.set('cid-version', 1)
    url.searchParams.set('raw-leaves', true)
    setAddParams(options, url.searchParams)

    if (file.type === 'application/car' || String(file.name).endsWith('.car')) {
      url.searchParams.set('format', 'car')
    }

    const headers = this.options.headers
    const response = await fetch(url.toString(), { method: 'POST', headers, body })

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
    }

    const data = await response.json()
    return { ...data, cid: data.cid['/'] }
  }

  /**
   * @param {Iterable<File|Blob>} files
   * @param {import('./index').PinOptions} [options]
   * @returns {Promise<import('./index').AddDirectoryResponse>}
   */
  async addDirectory (files, options) {
    const body = new FormData()

    for (const f of files) {
      if (!(f instanceof File) && !(f instanceof Blob)) {
        throw new Error('invalid file')
      }
      body.append('file', f, f.name)
    }

    const url = new URL('add', this.url)
    url.searchParams.set('cid-version', 1)
    url.searchParams.set('raw-leaves', true)
    setAddParams(options, url.searchParams)
    url.searchParams.set('stream-channels', false)
    url.searchParams.set('wrap-with-directory', true)

    const headers = this.options.headers
    const response = await fetch(url.toString(), { method: 'POST', headers, body })

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
    }

    const results = await response.json()
    for (const f of results) {
      f.cid = f.cid['/']
    }
    return results
  }

  /**
   * @param {string} cid CID or IPFS/IPNS path to pin to the cluster.
   * @param {import('./index').PinOptions} [options]
   * @returns {Promise<import('./index').PinResponse>}
   */
  async pin (cid, options) {
    const path = cid.startsWith('/') ? `pins${cid}` : `pins/${cid}`
    const url = new URL(path, this.url)
    setPinOptions(options, url.searchParams)

    const headers = this.options.headers
    const response = await fetch(url.toString(), { method: 'POST', headers })

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
    }

    const data = await response.json()
    return toPinResponse(data)
  }

  /**
   * @param {string} cid CID or IPFS/IPNS path to unpin from the cluster.
   * @returns {Promise<import('./index').PinResponse>}
   */
  async unpin (cid) {
    const path = cid.startsWith('/') ? `pins${cid}` : `pins/${cid}`
    const url = new URL(path, this.url)
    const headers = this.options.headers
    const response = await fetch(url.toString(), { method: 'DELETE', headers })

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
    }

    const data = await response.json()
    return toPinResponse(data)
  }

  /**
   * @param {string} cid The CID to get pin status information for.
   * @param {import('./index').StatusOptions} [options]
   * @returns {Promise<import('./index').StatusResponse>}
   */
  async status (cid, options) {
    const url = new URL(`pins/${encodeURIComponent(cid)}`, this.url)

    options = options || {}
    if (options.local != null) {
      url.searchParams.set('local', options.local)
    }

    const headers = this.options.headers
    const response = await fetch(url.toString(), { headers })

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
    }

    const data = await response.json()
    let peerMap = data.peer_map
    if (peerMap) {
      peerMap = Object.fromEntries(Object.entries(peerMap).map(([k, v]) => (
        [k, { peerName: v.peername, status: v.status, timestamp: new Date(v.timestamp), error: v.error }]
      )))
    }

    return { cid: data.cid['/'], name: data.name, peerMap }
  }

  /**
   * @param {string} cid The CID to get pin status information for.
   * @returns {Promise<import('./index').PinResponse>}
   */
  async allocation (cid) {
    const url = new URL(`allocations/${encodeURIComponent(cid)}`, this.url)
    const headers = this.options.headers
    const response = await fetch(url.toString(), { headers })

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
    }

    const data = await response.json()
    return toPinResponse(data)
  }

  /**
   * @param {string} cid The CID to get pin status information for.
   * @param {import('./index').RecoverOptions} [options]
   * @returns {Promise<import('./index').StatusResponse>}
   */
  async recover (cid, options) {
    const url = new URL(`pins/${encodeURIComponent(cid)}/recover`, this.url)

    options = options || {}
    if (options.local != null) {
      url.searchParams.set('local', options.local)
    }

    const headers = this.options.headers
    const response = await fetch(url.toString(), { method: 'POST', headers })

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
    }

    const data = await response.json()
    let peerMap = data.peer_map
    if (peerMap) {
      peerMap = Object.fromEntries(Object.entries(peerMap).map(([k, v]) => (
        [k, { peerName: v.peername, status: v.status, timestamp: new Date(v.timestamp), error: v.error }]
      )))
    }

    return { cid: data.cid['/'], name: data.name, peerMap }
  }

  /**
   * @returns {Promise<string[]>}
   */
  async metricNames () {
    const url = new URL('monitor/metrics', this.url)
    const headers = this.options.headers
    const response = await fetch(url.toString(), { headers })

    if (!response.ok) {
      throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
    }

    const data = await response.json()
    return data
  }
}

/**
 * @param {import('./index').AddParams} options
 * @param {URLSearchParams} searchParams
 */
function setAddParams (options, searchParams) {
  options = options || {}
  setPinOptions(options)
  if (options.local != null) {
    searchParams.set('local', options.local)
  }
  if (options.recursive != null) {
    searchParams.set('recursive', options.recursive)
  }
  if (options.hidden != null) {
    searchParams.set('hidden', options.hidden)
  }
  if (options.wrap != null) {
    searchParams.set('wrap', options.wrap)
  }
  if (options.shard != null) {
    searchParams.set('shard', options.shard)
  }
  if (options.streamChannels != null) {
    searchParams.set('stream-channels', options.streamChannels)
  }
  if (options.format != null) {
    searchParams.set('format', options.format)
  }
  // IPFSAddParams
  if (options.layout != null) {
    searchParams.set('layout', options.layout)
  }
  if (options.chunker != null) {
    searchParams.set('chunker', options.chunker)
  }
  if (options.rawLeaves != null) {
    searchParams.set('raw-leaves', options.rawLeaves)
  }
  if (options.progress != null) {
    searchParams.set('progress', options.progress)
  }
  if (options.cidVersion != null) {
    searchParams.set('cid-version', options.cidVersion)
  }
  if (options.hashFun != null) {
    searchParams.set('hash', options.hashFun)
  }
  if (options.noCopy != null) {
    searchParams.set('no-copy', options.noCopy)
  }
}

/**
 * @param {import('./index').PinOptions} options
 * @param {URLSearchParams} searchParams
 */
function setPinOptions (options, searchParams) {
  options = options || {}
  if (options.replicationFactorMin != null) {
    searchParams.set('replication_factor_min', options.replicationFactorMin)
  }
  if (options.replicationFactorMax != null) {
    searchParams.set('replication_factor_max', options.replicationFactorMax)
  }
  if (options.name != null) {
    searchParams.set('name', options.name)
  }
  if (options.mode != null) {
    searchParams.set('mode', options.mode)
  }
  if (options.shardSize != null) {
    searchParams.set('shard_size', options.shardSize)
  }
  if (options.userAllocations != null) {
    for (const a of options.userAllocations) {
      searchParams.append('user_allocations', a)
    }
  }
  if (options.expireAt != null) {
    searchParams.set('expire_at', options.expireAt.toISOString())
  }
  if (options.metadata != null) {
    for (const [k, v] of Object.entries(options.metadata)) {
      searchParams.set(`meta-${k}`, v)
    }
  }
  if (options.pinUpdate != null) {
    searchParams.set('pin_update', options.pinUpdate)
  }
}

/**
 * @param {any} data
 * @returns {import('./index').PinResponse}
 */
function toPinResponse (data) {
  return {
    replicationFactorMin: data.replication_factor_min,
    replicationFactorMax: data.replication_factor_max,
    name: data.name,
    mode: data.mode,
    shardSize: data.shard_size,
    userAllocations: data.user_allocations,
    expireAt: new Date(data.expire_at),
    metadata: data.metadata,
    pinUpdate: data.pin_update,
    cid: data.cid['/'],
    type: data.type,
    allocations: data.allocations,
    maxDepth: data.max_depth,
    reference: data.reference
  }
}
