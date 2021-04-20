# ipfs-cluster

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

const cluster = new Cluster('https://your-cluster-domain.com', { auth: 'TOKEN' })

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

This library is **WIP** and not _all_ cluster HTTP API methods are available yet.

### Constructor

Create a new instance of the cluster client.

```js
import { Cluster } from '@nftstorage/ipfs-cluster'
const cluster = new Cluster('https://your-cluster-domain.com', { auth: 'TOKEN' })
```

### `add`

Import a file to the cluster. First argument must be a `File` or `Blob`.

```js
const file = new File(['foo'], 'foo.txt')
const { cid } = await cluster.add(file)
```

### `addDirectory`

Imports multiple files to the cluster. First argument must be an array of `File` or `Blob`.

```js
const files = [
  new File(['foo'], 'foo.txt'),
  new File(['bar'], 'bar.txt'),
]
const dir = await cluster.addDirectory(file)

for (const entry of dir) {
  console.log(entry.cid)
}
```

### `pin`

Tracks a CID with the given replication factor and a name for human-friendliness.

```js
const cid = 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu'
const { cid } = await cluster.pin(cid)
```

### `unpin`

Untracks a CID from cluster.

```js
const cid = 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu'
const { cid } = await cluster.pin(cid)
```

### `status`

Returns the current IPFS state for a given CID.

```js
const cid = 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu'
const status = await cluster.status(cid)

for (const [clusterPeerID, pinInfo] of Object.entries(status.peerMap)) {
  console.log(`${clusterPeerID}: ${pinInfo.status}`)
}
```
