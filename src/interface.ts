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

export enum PinType {
  /**
   * Bad type showing up anywhere indicates a bug
   */
  BAD = 1,
  /**
   * Data is a regular, non-sharded pin. It is pinned recursively.
   * It has no associated reference.
   */
  DATA = 2,
  /**
   * Meta tracks the original CID of a sharded DAG. Its Reference points to the
   * Cluster DAG CID.
   */
  META = 3,
  /**
   * ClusterDAG pins carry the CID of the root node that points to all the
   * shard-root-nodes of the shards in which a DAG has been divided. Its
   * Reference carries the MetaType CID.
   * ClusterDAGType pins are pinned directly everywhere.
   */
  CLUSTER_DAG = 4,
  /**
   * Shard pins carry the root CID of a shard, which points to individual blocks
   * on the original DAG that the user is adding, which has been sharded. They
   * carry a Reference to the previous shard. ShardTypes are pinned with
   * MaxDepth=1 (root and direct children only).
   */
  SHARD = 5
}

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

export interface StatusAllOptions extends RequestOptions {
  local?: boolean
  filter?: TrackerStatus[]
}

export type RecoverOptions = StatusOptions

export type StatusResponse = {
  cid: string
  name: string
  peerMap: Record<string, PinInfo>
}

export type PinInfo = {
  peerName: string
  status: TrackerStatus
  timestamp: Date
  error: string
}

export enum TrackerStatus {
  /**
   * IPFSStatus should never take this value. When used as a filter. It means
   * "all".
   */
  UNDEFINED = 'undefined',
  /**
   * The cluster node is offline or not responding.
   */
  CLUSTER_ERROR = 'cluster_error',
  /**
   * An error occurred pinning.
   */
  PIN_ERROR = 'pin_error',
  /**
   * An error occurred unpinning.
   */
  UNPIN_ERROR = 'unpin_error',
  /**
   * The IPFS daemon has pinned the item.
   */
  PINNED = 'pinned',
  /**
   * The IPFS daemon is currently pinning the item.
   */
  PINNING = 'pinning',
  /**
   * The IPFS daemon is currently unpinning the item.
   */
  UNPINNING = 'unpinning',
  /**
   * The IPFS daemon is not pinning the item.
   */
  UNPINNED = 'unpinned',
  /**
   * The IPFS daemon is not pinning the item but it is being tracked.
   */
  REMOTE = 'remote',
  /**
   * The item has been queued for pinning on the IPFS daemon.
   */
  PIN_QUEUED = 'pin_queued',
  /**
   * The item has been queued for unpinning on the IPFS daemon.
   */
  UNPIN_QUEUED = 'unpin_queued',
  /**
   * The IPFS daemon is not pinning the item through this CID but it is tracked
   * in a cluster dag
   */
  SHARDED = 'sharded'
}

export interface PeerInfo {
  id: string
  addresses: string[]
}

export interface ClusterInfo extends PeerInfo {
  version: string
  commit: string
  peerName: string
  rpcProtocolVersion: string
  clusterPeers: string[]
  clusterPeersAddresses: string[]
  ipfs: PeerInfo
}
