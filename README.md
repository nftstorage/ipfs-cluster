# ipfs-cluster

[![dependencies Status](https://status.david-dm.org/gh/nftstorage/ipfs-cluster.svg)](https://david-dm.org/nftstorage/ipfs-cluster)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![minzip size](https://badgen.net/bundlephobia/minzip/@nftstorage/ipfs-cluster)](https://bundlephobia.com/result?p=@nftstorage/ipfs-cluster)

A zero-dependency client to the [IPFS Cluster](https://cluster.ipfs.io/) HTTP API, built for the browser.

## Install

Import it from your favourite CDN (e.g. skypack.dev, unpkg.com, jsdelivr.com) or install directly from npm:

```sh
npm i @nftstorage/ipfs-cluster
```

## Usage

Example:

```js
import { Cluster } from 'https://cdn.skypack.dev/@nftstorage/ipfs-cluster'

const cluster = new Cluster('https://your-cluster-domain.com')

const file = new File(['foo'], 'foo.txt')
const { cid } = await cluster.add(file)
console.log(cid) // bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu
```

### Using in Node.js

This library is designed to run in the browser or in web workers but it can be run in Node.js if required web APIs are added to the global environment. For exmaple:

```js
import fetch from '@web-std/fetch'
import { FormData } from '@web-std/form-data'
import { File, Blob } from '@web-std/file'

Object.assign(global, { fetch, File, Blob, FormData })
```

## API

This library is **WIP** and not _all_ cluster HTTP API methods are available yet (PR's welcome!). Please see the [typescript types](https://github.com/nftstorage/ipfs-cluster/blob/main/src/interface.ts) for full parameter and return types.

Note: all methods take an options object with a `signal` property - an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) from an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) allowing the request to be aborted by the caller.

- [Constructor](#constructor)
- [`add`](#add)
- [`addCAR`](#addcar)
- [`addDirectory`](#adddirectory)
- `alerts`
- [`allocations`](#allocations)
- `id`
- `metrics`
- [`metricNames`](#metricnames)
- [`peerList`](#peerlist)
- `peerAdd`
- `peerRemove`
- [`pin`](#pin)
- `pinPath`
- [`recover`](#recover)
- `recoverAll`
- `repoGC`
- [`status`](#status)
- [`statusAll`](#statusall)
- `version`
- [`unpin`](#unpin)
- `unpinPath`

### Constructor

Create a new instance of the cluster client.

```js
import { Cluster } from '@nftstorage/ipfs-cluster'
const cluster = new Cluster('https://your-cluster-domain.com', {
  // optional custom headers for e.g. auth
  headers: { Authorization: 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==' }
})
```

### `add`

Import a file to the cluster. First argument must be a `File` or `Blob`.

```js
const file = new File(['foo'], 'foo.txt')
const { cid } = await cluster.add(file)
```

Note: by default this module uses v1 CIDs and raw leaves enabled.

### `addCAR`

Alternatively you can import data from a [CAR (Content Addressable aRchive)](https://github.com/ipld/specs/blob/master/block-layer/content-addressable-archives.md) file:

```js
const car = new Blob(carFileData, { type: 'application/car' })
const { cid } = await cluster.addCAR(car)
```

[More information on reading and writing CAR files in JS](https://github.com/ipld/js-car#readme).

### `addDirectory`

Imports multiple files to the cluster. First argument must be an array of `File` or `Blob`.

```js
const files = [new File(['foo'], 'foo.txt'), new File(['bar'], 'bar.txt')]
const dir = await cluster.addDirectory(file)

for (const entry of dir) {
  console.log(entry.cid)
  // bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu
  // bafybeidsnna57jpm2ttwaydwak25qpkxafrg4cnrjsfqipbcqxlsfobjje
}
```

Note: by default this module uses v1 CIDs and raw leaves enabled.

### `allocation`

Returns the current allocation for a given CID.

```js
const cid = 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu'
const allocation = await cluster.allocation(cid)
```

### `metricNames`

Get a list of metric types known to the peer.

```js
const names = await cluster.metricNames()
console.log(names) // [ 'ping', 'freespace' ]
```

### `peerList`

Get a list of Cluster peer info.

```js
const peers = await cluster.peerList()
peers.forEach((peer) => {
  console.log(`${peer.id} | ${peer.peerName}`)
  console.log('  > Addresses:')
  peer.addresses.forEach((addr) => console.log(`    - ${addr}`))
  console.log(`  > IPFS: ${peer.ipfs.id}`)
  peer.ipfs.addresses.forEach((addr) => console.log(`    - ${addr}`))
})
```

### `pin`

Tracks a CID with the given replication factor and a name for human-friendliness.

```js
const cid = 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu'
const { cid } = await cluster.pin(cid)
```

### `recover`

Re-triggers pin or unpin IPFS operations for a CID in error state.

```js
const cid = 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu'
const { cid } = await cluster.recover(cid)
```

### `status`

Returns the current IPFS state for a given CID.

```js
const cid = 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu'
const status = await cluster.status(cid)

for (const [clusterPeerID, pinInfo] of Object.entries(status.peerMap)) {
  console.log(`${clusterPeerID}: ${pinInfo.status}`)
  // e.g.
  // 12D3KooWAjKw14hMUo7wdyEu9KwogrUFCCMiQZApgZ4zMcvtcacj: pinned
  // 12D3KooWKiebn7GqPvjqjKARnm47Xoez6f1civBEWxef3u5G6UdM: pinned
  // 12D3KooWLKdPdFx5UpPNwoVmMXsLULCDegAqXZ7RAgpKuPSMKoSS: pinned
}
```

### `statusAll`

Status of all tracked CIDs. Note: this is an expensive operation. Use the optional filters when possible.

```js
const statuses = await cluster.statusAll()
for (const status of statuses) {
  console.log(`${status.cid}:`)
  for (const [clusterPeerID, pinInfo] of Object.entries(status.peerMap)) {
    console.log(`    ${clusterPeerID}: ${pinInfo.status}`)
  }
}
// e.g.
// bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu:
//     12D3KooWAjKw14hMUo7wdyEu9KwogrUFCCMiQZApgZ4zMcvtcacj: pinned
//     12D3KooWKiebn7GqPvjqjKARnm47Xoez6f1civBEWxef3u5G6UdM: pinned
//     12D3KooWLKdPdFx5UpPNwoVmMXsLULCDegAqXZ7RAgpKuPSMKoSS: pinned
// bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy:
//     12D3KooWAjKw14hMUo7wdyEu9KwogrUFCCMiQZApgZ4zMcvtcacj: queued
//     12D3KooWKiebn7GqPvjqjKARnm47Xoez6f1civBEWxef3u5G6UdM: queued
//     12D3KooWLKdPdFx5UpPNwoVmMXsLULCDegAqXZ7RAgpKuPSMKoSS: queued
// ...etc.
```

Note: The method takes an options object that allows filtering by status or cid e.g.

```js
// retrieve only pinning and pinned items
await cluster.statusAll({ filter: ['pinning', 'pinned'] })

// retrieve status for the passed list of CIDs (requires Cluster version >= 0.14.5-rc1)
await cluster.statusAll({
  cids: ['bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu']
})
```

### `unpin`

Untracks a CID from cluster.

```js
const cid = 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu'
await cluster.unpin(cid)
```

## Contribute

Feel free to dive in! [Open an issue](https://github.com/nftstorage/ipfs-cluster/issues/new) or submit PRs.

## License

[APACHE-2.0](LICENSE-APACHE) AND [MIT](LICENSE-MIT)
