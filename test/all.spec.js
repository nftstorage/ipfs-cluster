import { describe, it } from 'mocha'
import * as assert from 'uvu/assert'

import fetch from '@web-std/fetch'
import { FormData } from '@web-std/form-data'
import { File, Blob } from '@web-std/file'
import { Cluster } from '@nftstorage/ipfs-cluster'
import { CarWriter } from '@ipld/car'
import * as CBOR from '@ipld/dag-cbor'
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'

Object.assign(global, { fetch, File, Blob, FormData })

// Run the test cluster quickstart to test:
// https://cluster.ipfs.io/documentation/quickstart/
// TODO: how to run on CI?
const URL = 'http://127.0.0.1:9094'

describe('cluster.add', () => {
  it('adds a file', async () => {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const result = await cluster.add(file)
    assert.equal(result.name, file.name)
    assert.equal(
      result.cid,
      'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy'
    )
    assert.equal(result.size, 3)
  })
})

describe('cluster.addDirectory', () => {
  it('adds a directory of files', async () => {
    const cluster = new Cluster(URL)
    const files = [new File(['foo'], 'foo.txt'), new File(['bar'], 'bar.txt')]
    const dir = await cluster.addDirectory(files)

    assert.equal(dir[0].name, files[0].name)
    assert.equal(dir[0].size, 3)
    assert.equal(
      dir[0].cid,
      'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy'
    )

    assert.equal(dir[1].name, files[1].name)
    assert.equal(dir[1].size, 3)
    assert.equal(
      dir[1].cid,
      'bafkreih43yvs5w5fnp2aqya7w4q75g24gogrb3sct2qe7lsvcg3i7p4pxe'
    )

    // (wrapper directory)
    assert.equal(dir[2].name, '')
    assert.equal(dir[2].size, 112)
    assert.equal(
      dir[2].cid,
      'bafybeidhbfwu4j2zckkqd42azgxm7hlvjjqj7dunvv7o7c3avyrhgtvppm'
    )
  })

  it('import dag via car file', async () => {
    const cluster = new Cluster(URL)
    const message = CBOR.encode({ hello: 'world' })
    const link = CID.createV1(CBOR.code, await sha256.digest(message))

    const dag = CBOR.encode({
      to: 'world',
      message: link
    })
    const cid = CID.createV1(CBOR.code, await sha256.digest(dag))

    const { writer, out } = CarWriter.create([cid])
    writer.put({ cid, bytes: dag })
    writer.put({ cid: link, bytes: message })
    writer.close()

    const parts = []
    for await (const chunk of out) {
      parts.push(chunk)
    }
    const car = new Blob(parts, { type: 'application/car' })

    const result = await cluster.add(car)

    assert.equal(result.name, 'blob')
    assert.equal(result.cid, cid.toString())
    assert.equal(result.bytes, message.byteLength + dag.byteLength)
  })
})

describe('cluster.pin', () => {
  it('pins a CID', async () => {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const name = `name-${Date.now()}`
    const metadata = { meta: `test-${Date.now()}` }
    const result = await cluster.pin(cid, { name, metadata })
    assert.equal(result.cid, cid)
    assert.equal(result.name, name)
    assert.equal(result.metadata, metadata)
  })

  it('gets pin status', async () => {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const status = await cluster.status(cid)

    assert.equal(status.cid, cid)
    for (const pinInfo of Object.values(status.peerMap)) {
      assert.ok(['pinning', 'pinned'].includes(pinInfo.status))
    }
  })
})

describe('cluster.allocation', () => {
  it('gets pin allocation', async () => {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const metadata = { meta: `test-${Date.now()}` }
    const { cid } = await cluster.add(file, { metadata })
    const allocation = await cluster.allocation(cid)
    assert.equal(allocation.metadata, metadata)
  })
})

describe('cluster.recover', () => {
  it('recovers an errored pin', async () => {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const status = await cluster.recover(cid)

    assert.equal(status.cid, cid)
    for (const pinInfo of Object.values(status.peerMap)) {
      assert.ok(['pinning', 'pinned'].includes(pinInfo.status))
    }
  })
})

describe('cluster.unpin', () => {
  it('unpins a CID', async () => {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const result = await cluster.unpin(cid)
    assert.ok(typeof result === 'object')
    // TODO: is there something we can assert on in the response?
  })
})

describe('cluster.metricNames', () => {
  it('gets metric names', async () => {
    const cluster = new Cluster(URL)
    const names = await cluster.metricNames()
    assert.ok(Array.isArray(names))
    names.forEach((n) => assert.equal(typeof n, 'string'))
  })
})
