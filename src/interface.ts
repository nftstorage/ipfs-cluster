export interface Config {
  /**
   * IPFS Cluster URL
   */
  url: URL
  /**
   * Additional headers to be included with requests.
   */
  headers?: Record<string, string>
}

export interface RequestOptions {
  /**
   * If provided, corresponding request will be aborted when signalled.
   */
  signal?: AbortSignal
}

export type AddResponse = {
  cid: string
  name?: string
  size?: number | string
  bytes?: number | string
}

export type AddDirectoryResponse = AddResponse[]

export interface PinOptions extends RequestOptions {
  replicationFactorMin?: number
  replicationFactorMax?: number
  name?: string
  mode?: 'recursive' | 'direct'
  shardSize?: number
  /**
   * The peers to which this pin should be allocated.
   */
  userAllocations?: string[]
  expireAt?: Date
  metadata?: Record<string, string>
  pinUpdate?: string
  /**
   * List of multiaddrs known to provide the data.
   */
  origins?: string[]
}

/**
 * Groups options specific to the ipfs-adder, which builds UnixFS DAGs with the
 * input files.
 */
export type IPFSAddParams = {
  layout?: string
  chunker?: string
  rawLeaves?: boolean
  progress?: boolean
  cidVersion?: 0 | 1
  hashFun?: string
  noCopy?: boolean
}

/**
 * Contains all of the configurable parameters needed to specify the importing
 * process of a file being added to an IPFS Cluster.
 */
export type AddParams = PinOptions &
  IPFSAddParams & {
    local?: boolean
    recursive?: boolean
    hidden?: boolean
    wrap?: boolean
    shard?: boolean
    streamChannels?: boolean
    format?: string
  }

export type AddCarParams = PinOptions & {
  streamChannels?: boolean
  local?: boolean
}

/**
 * Bad type showing up anywhere indicates a bug
 */
export type PinTypeBad = 1
/**
 * Data is a regular, non-sharded pin. It is pinned recursively.
 * It has no associated reference.
 */
export type PinTypeData = 2
/**
 * Meta tracks the original CID of a sharded DAG. Its Reference points to the
 * Cluster DAG CID.
 */
export type PinTypeMeta = 3
/**
 * ClusterDAG pins carry the CID of the root node that points to all the
 * shard-root-nodes of the shards in which a DAG has been divided. Its
 * Reference carries the MetaType CID.
 * ClusterDAGType pins are pinned directly everywhere.
 */
export type PinTypeClusterDag = 4
/**
 * Shard pins carry the root CID of a shard, which points to individual blocks
 * on the original DAG that the user is adding, which has been sharded. They
 * carry a Reference to the previous shard. ShardTypes are pinned with
 * MaxDepth=1 (root and direct children only).
 */
export type PinTypeShard = 5

/**
 * PinType specifies which sort of Pin object we are dealing with.
 * In practice, the PinType decides how a Pin object is treated by the
 * PinTracker.
 *
 * A sharded Pin would look like:
 *
 * ```
 * [ Meta ] // (not pinned on IPFS, only present in cluster state)
 *   |
 *   v
 * [ Cluster DAG ] // (pinned everywhere in "direct")
 *   |      ..  |
 *   v          v
 * [Shard1] .. [ShardN] // (allocated to peers and pinned with max-depth=1
 * | | .. |    | | .. |
 * v v .. v    v v .. v
 * [][]..[]    [][]..[] Blocks // (indirectly pinned on ipfs, not tracked in cluster)
 * ```
 */
export type PinType =
  | PinTypeBad
  | PinTypeData
  | PinTypeMeta
  | PinTypeClusterDag
  | PinTypeShard

export type PinResponse = {
  replicationFactorMin: number
  replicationFactorMax: number
  name: string
  mode: 'recursive' | 'direct'
  shardSize: number
  /**
   * The peers to which this pin is allocated.
   */
  userAllocations?: string[]
  expireAt: Date
  metadata?: Record<string, string>
  pinUpdate?: string
  cid: string
  /**
   * Specifies which sort of Pin object we are dealing with. In practice, the
   * type decides how a Pin object is treated by the PinTracker.
   */
  type: PinType
  /**
   * The peers to which this pin is allocated.
   */
  allocations: string[]
  /**
   * Indicates how deep a pin should be pinned, with -1 meaning "to the bottom",
   * or "recursive".
   */
  maxDepth: number
  /**
   * We carry a reference CID to this pin. For ClusterDAGs, it is the MetaPin
   * CID. For the MetaPin it is the ClusterDAG CID. For Shards, it is the
   * previous shard CID. When not needed it is undefined.
   */
  reference?: string
}

export interface StatusOptions extends RequestOptions {
  local?: boolean
}

export interface StatusAllOptions extends StatusOptions {
  filter?: FilterTrackerStatus[]
  cids?: string[]
}

export type RecoverOptions = StatusOptions

export type StatusResponse = {
  cid: string
  name: string
  peerMap: Record<string, PinInfo>
}

export type PinInfo = {
  peerName: string
  ipfsPeerId: string
  status: TrackerStatus
  timestamp: Date
  error?: string
}

/**
 * IPFSStatus should never be this value. When used as a filter it means "all".
 */
export type TrackerStatusUndefined = 'undefined'
/**
 * The cluster node is offline or not responding.
 */
export type TrackerStatusClusterError = 'cluster_error'
/**
 * An error occurred pinning.
 */
export type TrackerStatusPinError = 'pin_error'
/**
 * An error occurred unpinning.
 */
export type TrackerStatusUnpinError = 'unpin_error'
/**
 * The IPFS daemon has pinned the item.
 */
export type TrackerStatusPinned = 'pinned'
/**
 * The IPFS daemon is currently pinning the item.
 */
export type TrackerStatusPinning = 'pinning'
/**
 * The IPFS daemon is currently unpinning the item.
 */
export type TrackerStatusUnpinning = 'unpinning'
/**
 * The IPFS daemon is not pinning the item.
 */
export type TrackerStatusUnpinned = 'unpinned'
/**
 * The IPFS daemon is not pinning the item but it is being tracked.
 */
export type TrackerStatusRemote = 'remote'
/**
 * The item has been queued for pinning on the IPFS daemon.
 */
export type TrackerStatusPinQueued = 'pin_queued'
/**
 * The item has been queued for unpinning on the IPFS daemon.
 */
export type TrackerStatusUnpinQueued = 'unpin_queued'
/**
 * The IPFS daemon is not pinning the item through this CID but it is tracked
 * in a cluster dag
 */
export type TrackerStatusSharded = 'sharded'
/**
 * The item is in the state and should be pinned, but it is however not pinned
 * and not queued/pinning.
 */
export type TrackerStatusUnexpectedlyUnpinned = 'unexpectedly_unpinned'

export type TrackerStatus =
  | TrackerStatusClusterError
  | TrackerStatusPinError
  | TrackerStatusUnpinError
  | TrackerStatusPinned
  | TrackerStatusPinning
  | TrackerStatusUnpinning
  | TrackerStatusUnpinned
  | TrackerStatusRemote
  | TrackerStatusPinQueued
  | TrackerStatusUnpinQueued
  | TrackerStatusSharded
  | TrackerStatusUnexpectedlyUnpinned

export type FilterTrackerStatus = TrackerStatus | TrackerStatusUndefined

export interface PeerInfo {
  id: string
  addresses: string[]
  error?: string
}

export interface ClusterInfo extends PeerInfo {
  id: string
  addresses: string[]
  version: string
  commit: string
  peerName: string
  rpcProtocolVersion: string
  clusterPeers: string[]
  clusterPeersAddresses: string[]
  ipfs: PeerInfo
  error?: string
}
