import fetch from '@web-std/fetch'
import { FormData } from '@web-std/form-data'
import { File, Blob } from '@web-std/file'
import assert from 'assert'
import { Cluster } from './index.js'
import { CarWriter } from '@ipld/car'
import * as CBOR from '@ipld/dag-cbor'
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'

Object.assign(global, { fetch, File, Blob, FormData })

// Run the test cluster quickstart to test:
// https://cluster.ipfs.io/documentation/quickstart/
// TODO: how to run on CI?
const URL = 'http://127.0.0.1:9094'

const tests = {
  async 'adds a file' () {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const result = await cluster.add(file)
    console.log(result)
    assert.strictEqual(result.name, file.name)
    assert.strictEqual(result.cid, 'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy')
    assert.strictEqual(result.size, 3)
  },

  async 'adds a directory of files' () {
    const cluster = new Cluster(URL)
    const files = [
      new File(['foo'], 'foo.txt'),
      new File(['bar'], 'bar.txt')
    ]
    const dir = await cluster.addDirectory(files)
    console.log(dir)

    assert.strictEqual(dir[0].name, files[0].name)
    assert.strictEqual(dir[0].size, 3)
    assert.strictEqual(dir[0].cid, 'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy')

    assert.strictEqual(dir[1].name, files[1].name)
    assert.strictEqual(dir[1].size, 3)
    assert.strictEqual(dir[1].cid, 'bafkreih43yvs5w5fnp2aqya7w4q75g24gogrb3sct2qe7lsvcg3i7p4pxe')

    // (wrapper directory)
    assert.strictEqual(dir[2].name, '')
    assert.strictEqual(dir[2].size, 112)
    assert.strictEqual(dir[2].cid, 'bafybeidhbfwu4j2zckkqd42azgxm7hlvjjqj7dunvv7o7c3avyrhgtvppm')
  },

  async 'import dag via car file' () {
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
    console.log(result)

    assert.strictEqual(result.name, 'blob')
    assert.strictEqual(result.cid, cid.toString())
    assert.strictEqual(result.bytes, message.byteLength + dag.byteLength)
  },

  async 'pins a CID' () {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const name = `name-${Date.now()}`
    const metadata = { meta: `test-${Date.now()}` }
    const result = await cluster.pin(cid, { name, metadata })
    console.log(result)
    assert.strictEqual(result.cid, cid)
    assert.strictEqual(result.name, name)
    assert.deepStrictEqual(result.metadata, metadata)
  },

  async 'gets pin status' () {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const status = await cluster.status(cid)
    console.log(status)

    assert.strictEqual(status.cid, cid)
    for (const pinInfo of Object.values(status.peerMap)) {
      assert(['pinning', 'pinned'].includes(pinInfo.status))
    }
  },

  async 'gets pin allocation' () {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const metadata = { meta: `test-${Date.now()}` }
    const { cid } = await cluster.add(file, { metadata })
    const allocation = await cluster.allocation(cid)
    console.log(allocation)
    assert.deepStrictEqual(allocation.metadata, metadata)
  },

  async 'recovers an errored pin' () {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const status = await cluster.recover(cid)
    console.log(status)

    assert.strictEqual(status.cid, cid)
    for (const pinInfo of Object.values(status.peerMap)) {
      assert(['pinning', 'pinned'].includes(pinInfo.status))
    }
  },

  async 'unpins a CID' () {
    const cluster = new Cluster(URL)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const result = await cluster.unpin(cid)
    console.log(result)
    // TODO: is there something we can assert on in the response?
  },

  async 'gets metric names' () {
    const cluster = new Cluster(URL)
    const names = await cluster.metricNames()
    console.log(names)
    assert(Array.isArray(names))
    names.forEach(n => assert.strictEqual(typeof n, 'string'))
  }
}

async function run () {
  for (const [name, impl] of Object.entries(tests)) {
    console.log(`>>> ${name}`)
    console.time(name)
    try {
      await impl()
    } finally {
      console.timeEnd(name)
    }
  }
}

run().catch(console.error)
