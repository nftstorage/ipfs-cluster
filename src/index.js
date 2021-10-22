/* eslint-env browser */

/**
 * Import a file to the cluster. First argument must be a `File` or `Blob`.
 * Note: by default this module uses v1 CIDs and raw leaves enabled.
 *
 * @param {import('./interface').Config} cluster
 * @param {File|Blob} file
 * @param {import('./interface').AddParams} [options]
 * @returns {Promise<import('./interface').AddResponse>}
 */
export const add = async (cluster, file, options = {}) => {
  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error('invalid file')
  }

  const body = new FormData()
  body.append('file', file, getName(file))

  const params = encodeAddParams(options)

  try {
    const result = await request(cluster, 'add', {
      params,
      method: 'POST',
      body,
      signal: options.signal
    })
    const data = params['stream-channels'] ? result : result[0]
    return { ...data, cid: data.cid['/'] }
  } catch (err) {
    const error = /** @type {Error & {response?:Response}}  */ (err)
    if (error.response?.ok) {
      throw new Error(
        `failed to parse response body from cluster add ${error.stack}`
      )
    } else {
      throw error
    }
  }
}

/**
 * @param {import('./interface').Config} cluster
 * @param {Iterable<File|Blob>} files
 * @param {import('../index').PinOptions} [options]
 * @returns {Promise<import('../index').AddDirectoryResponse>}
 */
export const addDirectory = async (cluster, files, options = {}) => {
  const body = new FormData()

  for (const f of files) {
    if (!(f instanceof File) && !(f instanceof Blob)) {
      throw new Error('invalid file')
    }
    body.append('file', f, getName(f))
  }

  const results = await request(cluster, 'add', {
    params: {
      ...encodeAddParams(options),
      'stream-channels': false,
      'wrap-with-directory': true
    },
    method: 'POST',
    body,
    signal: options.signal
  })

  for (const f of results) {
    f.cid = f.cid['/']
  }

  return results
}

/**
 * @param {import('./interface').Config} cluster
 * @param {Blob} car
 * @param {import('../index').AddParams} [options]
 * @returns {Promise<import('../index').AddResponse>}
 */
export const addCAR = (cluster, car, options = {}) =>
  add(cluster, car, { ...options, format: 'car' })

/**
 * @param {import('./interface').Config} cluster
 * @param {string} cid CID or IPFS/IPNS path to pin to the cluster.
 * @param {import('../index').PinOptions} [options]
 * @returns {Promise<import('../index').PinResponse>}
 */
export const pin = async (cluster, cid, options = {}) => {
  const path = cid.startsWith('/') ? `pins${cid}` : `pins/${cid}`

  const data = await request(cluster, path, {
    params: encodePinOptions(options),
    method: 'POST',
    signal: options.signal
  })

  return toPinResponse(data)
}

/**
 * @param {import('./interface').Config} cluster
 * @param {string} cid CID or IPFS/IPNS path to unpin from the cluster.
 * @param {import('../index').RequestOptions} [options]
 * @returns {Promise<import('../index').PinResponse>}
 */
export const unpin = async (cluster, cid, { signal } = {}) => {
  const path = cid.startsWith('/') ? `pins${cid}` : `pins/${cid}`
  const data = await request(cluster, path, {
    method: 'DELETE',
    signal
  })

  return toPinResponse(data)
}

/**
 * @param {import('./interface').Config} cluster
 * @param {string} cid The CID to get pin status information for.
 * @param {import('../index').StatusOptions} [options]
 * @returns {Promise<import('../index').StatusResponse>}
 */
export const status = async (cluster, cid, { local, signal } = {}) => {
  const path = `pins/${encodeURIComponent(cid)}`

  const data = await request(cluster, path, {
    params: local != null ? { local } : undefined,
    signal
  })

  let peerMap = data.peer_map
  if (peerMap) {
    peerMap = Object.fromEntries(
      Object.entries(peerMap).map(([k, v]) => [
        k,
        {
          peerName: v.peername,
          status: v.status,
          timestamp: new Date(v.timestamp),
          error: v.error
        }
      ])
    )
  }

  return { cid: data.cid['/'], name: data.name, peerMap }
}

/**
 * @param {import('./interface').Config} cluster
 * @param {string} cid The CID to get pin status information for.
 * @param {import('../index').RequestOptions} [options]
 * @returns {Promise<import('../index').PinResponse>}
 */
export const allocation = async (cluster, cid, { signal } = {}) => {
  const path = `allocations/${encodeURIComponent(cid)}`
  const data = await request(cluster, path, { signal })

  return toPinResponse(data)
}

/**
 * @param {import('./interface').Config} cluster
 * @param {string} cid The CID to get pin status information for.
 * @param {import('../index').RecoverOptions} [options]
 * @returns {Promise<import('../index').StatusResponse>}
 */
export const recover = async (cluster, cid, { local, signal } = {}) => {
  const path = `pins/${encodeURIComponent(cid)}/recover`

  const data = await request(cluster, path, {
    method: 'POST',
    params: local != null ? { local } : undefined,
    signal
  })

  let peerMap = data.peer_map
  if (peerMap) {
    peerMap = Object.fromEntries(
      Object.entries(peerMap).map(([k, v]) => [
        k,
        {
          peerName: v.peername,
          status: v.status,
          timestamp: new Date(v.timestamp),
          error: v.error
        }
      ])
    )
  }

  return { cid: data.cid['/'], name: data.name, peerMap }
}

/**
 * @param {import('./interface').Config} cluster
 * @param {import('../index').RequestOptions} [options]
 * @returns {Promise<string[]>}
 */
export const metricNames = (cluster, { signal } = {}) =>
  request(cluster, 'monitor/metrics', { signal })

/**
 *
 * @param {import('./interface').Config} cluster
 * @param {string} path
 * @param {Object} [options]
 * @param {string} [options.method]
 * @param {Record<string, string|number|boolean|null|undefined>} [options.params]
 * @param {BodyInit} [options.body]
 * @param {AbortSignal} [options.signal]
 */
const request = async (cluster, path, { method, params, body, signal }) => {
  const endpoint = new URL(path, cluster.url)
  for (const [key, value] of Object.entries(params || {})) {
    if (value != null) {
      endpoint.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(endpoint.href, {
    method,
    body,
    signal
  })

  if (response.ok) {
    return await response.json()
  } else {
    throw Object.assign(
      new Error(`${response.status}: ${response.statusText}`),
      { response }
    )
  }
}

export class Cluster {
  /**
   * @param {URL|string} url Cluster HTTP API root URL.
   * @param {{ headers?: Record<string, string> }} [options]
   */
  constructor(url, { headers } = {}) {
    /**
     * @readonly
     */
    this.url = new URL(url)
    /**
     * @readonly
     */
    this.headers = headers
  }

  /**
   * @param {File|Blob} file
   * @param {import('../index').AddParams} [options]
   */
  add(file, options) {
    return add(this, file, options)
  }

  /**
   * @param {Iterable<File|Blob>} files
   * @param {import('../index').PinOptions} [options]
   * @returns {Promise<import('../index').AddDirectoryResponse>}
   */
  addDirectory(files, options) {
    return addDirectory(this, files, options)
  }

  /**
   * @param {Blob} car
   * @param {import('../index').AddParams} [options]
   * @returns {Promise<import('../index').AddResponse>}
   */
  addCAR(car, options = {}) {
    return addCAR(this, car, { ...options, format: 'car' })
  }

  /**
   * @param {string} cid CID or IPFS/IPNS path to pin to the cluster.
   * @param {import('../index').PinOptions} [options]
   * @returns {Promise<import('../index').PinResponse>}
   */
  pin(cid, options) {
    return pin(this, cid, options)
  }

  /**
   * @param {string} cid CID or IPFS/IPNS path to unpin from the cluster.
   * @param {import('../index').RequestOptions} [options]
   * @returns {Promise<import('../index').PinResponse>}
   */
  unpin(cid, options) {
    return unpin(this, cid, options)
  }

  /**
   * @param {string} cid The CID to get pin status information for.
   * @param {import('../index').StatusOptions} [options]
   * @returns {Promise<import('../index').StatusResponse>}
   */
  status(cid, options) {
    return status(this, cid, options)
  }

  /**
   * @param {string} cid The CID to get pin status information for.
   * @param {import('../index').RequestOptions} [options]
   * @returns {Promise<import('../index').PinResponse>}
   */
  allocation(cid, options) {
    return allocation(this, cid, options)
  }

  /**
   * @param {string} cid The CID to get pin status information for.
   * @param {import('../index').RecoverOptions} [options]
   * @returns {Promise<import('../index').StatusResponse>}
   */
  recover(cid, options) {
    return recover(this, cid, options)
  }

  /**
   * @param {import('../index').RequestOptions} [options]
   * @returns {Promise<string[]>}
   */
  metricNames(options) {
    return metricNames(this, options)
  }
}

/**
 * @param {import('../index').AddParams} options
 */
const encodeAddParams = (options = {}) =>
  encodeParams({
    ...encodePinOptions(options),
    local: options.local,
    recursive: options.recursive,
    hidden: options.hidden,
    wrap: options.wrap,
    shard: options.shard,
    // stream-channels=false means buffer entire response in cluster before returning.
    // MAY avoid weird edge-cases with prematurely closed streams
    // see: https://github.com/web3-storage/web3.storage/issues/323
    'stream-channels':
      options.streamChannels != null ? options.streamChannels : false,
    format: options.format,
    // IPFSAddParams
    layout: options.layout,

    chunker: options.chunker,
    'raw-leaves': options.rawLeaves != null ? options.rawLeaves : true,
    progress: options.progress,
    'cid-version': options.cidVersion != null ? options.cidVersion : 1,
    hash: options.hashFun,
    'no-copy': options.noCopy
  })

/**
 * @param {import('../index').PinOptions} options
 */
const encodePinOptions = (options = {}) =>
  encodeParams({
    name: options.name,
    mode: options.mode,
    'replication-min': options.replicationFactorMin,
    'replication-max': options.replicationFactorMax,
    'shard-size': options.shardSize,
    'user-allocations': options.userAllocations?.join(','),
    'expire-at': options.expireAt?.toISOString(),
    'pin-update': options.pinUpdate,
    origins: options.origins?.join(','),
    ...encodeMetadata(options.metadata || {})
  })

/**
 *
 * @param {Record<string, string>} metadata
 */
const encodeMetadata = (metadata = {}) =>
  Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`meta-${k}`, v]))

/**
 * @template {Object} T
 * @param {T} options
 * @returns {{[K in keyof T]: Exclude<T[K], undefined>}}
 */
const encodeParams = (options) =>
  // @ts-ignore - it can't infer this
  Object.fromEntries(Object.entries(options).filter(([, v]) => v != null))

/**
 * @param {any} data
 * @returns {import('../index').PinResponse}
 */
const toPinResponse = (data) => {
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

/**
 *
 * @param {File|(Blob&{name?:string})} file
 * @returns
 */
const getName = (file) => file.name
