/* eslint-env browser */

import * as API from './interface.js'

/**
 * Gets cluster version
 *
 * @param {API.Config} cluster
 * @param {API.RequestOptions} [options]
 * @returns {Promise<string>}
 */
export const version = async (cluster, { signal } = {}) => {
  const result = await request(cluster, 'version', {
    method: 'GET',
    signal
  })

  if (typeof result.version !== 'string') {
    throw new Error(
      `failed to parse version from response the body: ${JSON.stringify(
        result,
        null,
        2
      )}`
    )
  }

  return result.version
}

/**
 * Gets cluster information
 *
 * @param {API.Config} cluster
 * @param {API.RequestOptions} [options]
 * @returns {Promise<API.ClusterInfo>}
 */
export const info = async (cluster, { signal } = {}) => {
  const result = await request(cluster, 'id', {
    method: 'GET',
    signal
  })

  const failure = result.error || result.ipfs?.error || ''
  if (failure.length > 0) {
    throw new Error(
      `cluster id response has failure: ${JSON.stringify(result, null, 2)}`
    )
  }

  const {
    id,
    addresses,
    version,
    commit,
    peername: peerName,
    rpc_protocol_version: rpcProtocolVersion,
    cluster_peers: clusterPeers,
    cluster_peers_addresses: clusterPeersAddresses,
    ipfs
  } = result

  return {
    id,
    addresses,
    version,
    commit,
    peerName,
    rpcProtocolVersion,
    clusterPeers,
    clusterPeersAddresses,
    ipfs
  }
}

/**
 * Import a file to the cluster. First argument must be a `File` or `Blob`.
 * Note: by default this module uses v1 CIDs and raw leaves enabled.
 *
 * @param {API.Config} cluster
 * @param {File|Blob} file
 * @param {API.AddParams} [options]
 * @returns {Promise<API.AddResponse>}
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
 * @param {API.Config} cluster
 * @param {Iterable<File|Blob>} files
 * @param {API.PinOptions} [options]
 * @returns {Promise<API.AddDirectoryResponse>}
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
 * @param {API.Config} cluster
 * @param {Blob} car
 * @param {API.AddParams} [options]
 * @returns {Promise<API.AddResponse>}
 */
export const addCAR = (cluster, car, options = {}) =>
  add(cluster, car, { ...options, format: 'car' })

/**
 * @param {API.Config} cluster
 * @param {string} cid CID or IPFS/IPNS path to pin to the cluster.
 * @param {API.PinOptions} [options]
 * @returns {Promise<API.PinResponse>}
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
 * @param {API.Config} cluster
 * @param {string} cid CID or IPFS/IPNS path to unpin from the cluster.
 * @param {API.RequestOptions} [options]
 * @returns {Promise<API.PinResponse>}
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
 * @param {API.Config} cluster
 * @param {string} cid The CID to get pin status information for.
 * @param {API.StatusOptions} [options]
 * @returns {Promise<API.StatusResponse>}
 */
export const status = async (cluster, cid, { local, signal } = {}) => {
  const path = `pins/${encodeURIComponent(cid)}`

  const data = await request(cluster, path, {
    params: local != null ? { local } : undefined,
    signal
  })

  return toStausResponse(data)
}

/**
 * @param {API.Config} cluster
 * @param {API.StatusAllOptions} [options]
 * @returns {Promise<API.StatusResponse[]>}
 */
export const statusAll = async (
  cluster,
  { local, filter, cids, signal } = {}
) => {
  const data = await request(cluster, 'pins', {
    params: {
      local,
      filter: filter ? String(filter) : null,
      cids: cids ? String(cids) : null
    },
    signal
  })
  if (!Array.isArray(data)) {
    throw new Error('response data is not an array')
  }
  return data.map((d) => toStausResponse(d))
}

/**
 * @param {API.Config} cluster
 * @param {string} cid The CID to get pin status information for.
 * @param {API.RequestOptions} [options]
 * @returns {Promise<API.PinResponse>}
 */
export const allocation = async (cluster, cid, { signal } = {}) => {
  const path = `allocations/${encodeURIComponent(cid)}`
  const data = await request(cluster, path, { signal })

  return toPinResponse(data)
}

/**
 * @param {API.Config} cluster
 * @param {string} cid The CID to get pin status information for.
 * @param {API.RecoverOptions} [options]
 * @returns {Promise<API.StatusResponse>}
 */
export const recover = async (cluster, cid, { local, signal } = {}) => {
  const path = `pins/${encodeURIComponent(cid)}/recover`

  const data = await request(cluster, path, {
    method: 'POST',
    params: local != null ? { local } : undefined,
    signal
  })

  return toStausResponse(data)
}

/**
 * @param {API.Config} cluster
 * @param {API.RequestOptions} [options]
 * @returns {Promise<string[]>}
 */
export const metricNames = (cluster, { signal } = {}) =>
  request(cluster, 'monitor/metrics', { signal })

/**
 * @param {API.Config} cluster
 * @param {string} path
 * @param {Object} [options]
 * @param {string} [options.method]
 * @param {Record<string, string|number|boolean|null|undefined>} [options.params]
 * @param {BodyInit} [options.body]
 * @param {AbortSignal} [options.signal]
 */
const request = async (
  { url, headers },
  path,
  { method, params, body, signal }
) => {
  const endpoint = new URL(path, url)
  for (const [key, value] of Object.entries(params || {})) {
    if (value != null) {
      endpoint.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(endpoint.href, {
    method: method || 'GET',
    headers,
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
   * Create a new instance of the cluster client.
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
   * Get Cluster version.
   * @param {API.RequestOptions} [options]
   */
  version(options) {
    return version(this, options)
  }

  /**
   * Get Cluster peer information.
   * @param {API.RequestOptions} [options]
   * @returns {Promise<API.ClusterInfo>}
   */
  info(options) {
    return info(this, options)
  }

  /**
   * Imports a file to the cluster. First argument must be a `File` or `Blob`.
   * Note: by default this module uses v1 CIDs and raw leaves enabled.
   * @param {File|Blob} file
   * @param {API.AddParams} [options]
   */
  add(file, options) {
    return add(this, file, options)
  }

  /**
   * Imports multiple files to the cluster. First argument must be an array of
   * `File` or `Blob`. Note: by default this module uses v1 CIDs and raw leaves
   * enabled.
   * @param {Iterable<File|Blob>} files
   * @param {API.PinOptions} [options]
   * @returns {Promise<API.AddDirectoryResponse>}
   */
  addDirectory(files, options) {
    return addDirectory(this, files, options)
  }

  /**
   * Imports blocks encoded in the given CAR file and pins them (similarly to
   * ipfs dag import). At the moment only CAR files MUST have only one root (the
   * one that will be pinned). . CAR files allow adding arbitrary IPLD-DAGs
   * through the Cluster API.
   * @param {Blob} car
   * @param {API.AddParams} [options]
   * @returns {Promise<API.AddResponse>}
   */
  addCAR(car, options = {}) {
    return addCAR(this, car, { ...options, format: 'car' })
  }

  /**
   * Tracks a CID with the given replication factor and a name for
   * human-friendliness.
   * @param {string} cid CID or IPFS/IPNS path to pin to the cluster.
   * @param {API.PinOptions} [options]
   * @returns {Promise<API.PinResponse>}
   */
  pin(cid, options) {
    return pin(this, cid, options)
  }

  /**
   * Untracks a CID from cluster.
   * @param {string} cid CID or IPFS/IPNS path to unpin from the cluster.
   * @param {API.RequestOptions} [options]
   * @returns {Promise<API.PinResponse>}
   */
  unpin(cid, options) {
    return unpin(this, cid, options)
  }

  /**
   * Returns the current IPFS state for a given CID.
   * @param {string} cid The CID to get pin status information for.
   * @param {API.StatusOptions} [options]
   * @returns {Promise<API.StatusResponse>}
   */
  status(cid, options) {
    return status(this, cid, options)
  }

  /**
   * Status of all tracked CIDs. Note: this is an expensive operation. Use the optional filters when possible.
   * @param {API.StatusAllOptions} [options]
   * @returns {Promise<API.StatusResponse[]>}
   */
  statusAll(options) {
    return statusAll(this, options)
  }

  /**
   * Returns the current allocation for a given CID.
   * @param {string} cid The CID to get pin status information for.
   * @param {API.RequestOptions} [options]
   * @returns {Promise<API.PinResponse>}
   */
  allocation(cid, options) {
    return allocation(this, cid, options)
  }

  /**
   * Re-triggers pin or unpin IPFS operations for a CID in error state.
   * @param {string} cid The CID to get pin status information for.
   * @param {API.RecoverOptions} [options]
   * @returns {Promise<API.StatusResponse>}
   */
  recover(cid, options) {
    return recover(this, cid, options)
  }

  /**
   * Get a list of metric types known to the peer.
   * @param {API.RequestOptions} [options]
   * @returns {Promise<string[]>}
   */
  metricNames(options) {
    return metricNames(this, options)
  }
}

/**
 * @param {API.AddParams} options
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
 * @param {API.PinOptions} options
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
 * @returns {API.PinResponse}
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
 * @param {any} data
 * @returns {API.StatusResponse}
 */
const toStausResponse = (data) => {
  let peerMap = data.peer_map
  if (peerMap) {
    peerMap = Object.fromEntries(
      Object.entries(peerMap).map(([k, v]) => [
        k,
        {
          peerName: v.peername,
          ipfsPeerId: v.ipfs_peer_id,
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
 * @param {File|(Blob&{name?:string})} file
 */
const getName = (file) => file.name

export const PinTypeBad = 1
export const PinTypeData = 2
export const PinTypeMeta = 3
export const PinTypeClusterDag = 4
export const PinTypeShard = 5

export const TrackerStatusUndefined = 'undefined'
export const TrackerStatusClusterError = 'cluster_error'
export const TrackerStatusPinError = 'pin_error'
export const TrackerStatusUnpinError = 'unpin_error'
export const TrackerStatusPinned = 'pinned'
export const TrackerStatusPinning = 'pinning'
export const TrackerStatusUnpinning = 'unpinning'
export const TrackerStatusUnpinned = 'unpinned'
export const TrackerStatusRemote = 'remote'
export const TrackerStatusPinQueued = 'pin_queued'
export const TrackerStatusUnpinQueued = 'unpin_queued'
export const TrackerStatusSharded = 'sharded'
export const TrackerStatusUnexpectedlyUnpinned = 'unexpectedly_unpinned'

export { API }
