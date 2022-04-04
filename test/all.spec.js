import { describe, it } from 'mocha'
import * as assert from 'uvu/assert'

import fetch from '@web-std/fetch'
import { FormData } from '@web-std/form-data'
import { File, Blob } from '@web-std/file'
import { Cluster } from '@nftstorage/ipfs-cluster'
import * as cluster from '@nftstorage/ipfs-cluster'
import { CarWriter } from '@ipld/car'
import * as CBOR from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'

Object.assign(global, { fetch, File, Blob, FormData })

// To run tests locally make sure you have cluster running,
// which you can do by running `yarn start`
const config = {
  url: new URL('http://127.0.0.1:9094'),
  headers: {
    Authorization: `Basic ${btoa('user:secret')}`
  }
}

describe('cluster.version', () => {
  it('gets cluster version (static)', async () => {
    const version = await cluster.version(config)
    assertField({ version }, 'version')
  })

  it('gets cluster version (method)', async () => {
    const cluster = new Cluster(config.url, config)
    const version = await cluster.version()
    assertField({ version }, 'version')
  })
})

describe('cluster.add', () => {
  it('adds a file', async () => {
    const cluster = new Cluster(config.url, config)

    const file = new File(['foo'], 'foo.txt')
    const result = await cluster.add(file)
    assert.equal(result.name, file.name)
    assert.equal(
      result.cid,
      'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy'
    )
    assert.equal(result.size, 3)
  })

  it('add a file via static API', async () => {
    const file = new File(['bar'], 'bar.txt')
    const result = await cluster.add(config, file)
    assert.equal(result.name, file.name)
    assert.equal(
      result.cid,
      'bafkreih43yvs5w5fnp2aqya7w4q75g24gogrb3sct2qe7lsvcg3i7p4pxe'
    )
    assert.equal(result.size, 3)
  })

  it('cars files are added as any other binary file', async () => {
    const cluster = new Cluster(config.url, config)
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
    assert.equal(
      result.cid,
      'bafkreiegp2z6crgmgywbndbozu5i7qmgwbkyom5pthjh7hlnbx53jr2ov4'
    )

    assert.equal(result.size, car.size)
  })
})

describe('cluster.addDirectory', () => {
  it('adds a directory of files', async () => {
    const cluster = new Cluster(config.url, config)
    const files = [new File(['foo'], 'foo.txt'), new File(['bar'], 'bar.txt')]
    const [foo, bar, dir] = await cluster.addDirectory(files)

    assert.equal(foo?.name, 'foo.txt')
    assert.equal(foo?.size, 3)
    assert.equal(
      foo?.cid,
      'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy'
    )

    assert.equal(bar?.name, 'bar.txt')
    assert.equal(bar?.size, 3)
    assert.equal(
      bar?.cid,
      'bafkreih43yvs5w5fnp2aqya7w4q75g24gogrb3sct2qe7lsvcg3i7p4pxe'
    )

    // (wrapper directory)
    assert.equal(dir?.name, '')
    assert.equal(dir?.size, 112)
    assert.equal(
      dir?.cid,
      'bafybeidhbfwu4j2zckkqd42azgxm7hlvjjqj7dunvv7o7c3avyrhgtvppm'
    )
  })

  it('cars files are added as any other binary file', async () => {
    const cluster = new Cluster(config.url, config)
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

    const result = await cluster.addDirectory([car])

    assert.equal(result.length, 2, 'should be just file and dir')
    const [file, dir] = result

    assert.equal(file?.name, 'blob')
    assert.equal(
      file?.cid,
      'bafkreiegp2z6crgmgywbndbozu5i7qmgwbkyom5pthjh7hlnbx53jr2ov4'
    )

    assert.equal(file?.size, car.size)

    assert.equal(
      dir?.cid,
      'bafybeigb72yomjwb4skbiq2ksjujly32ijq3a4jawxfc7q2gbhbe7m4rm4'
    )
  })
})

describe('cluster.addCAR', () => {
  it('import car file', async () => {
    const cluster = new Cluster(config.url, config)
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

    const result = await cluster.addCAR(car)

    assert.equal(result.name, 'blob')
    assert.equal(result.cid, cid.toString())
    assert.equal(result.bytes, message.byteLength + dag.byteLength)
  })
})
describe('cluster.pin', () => {
  it('pins a CID', async () => {
    const cluster = new Cluster(config.url, config)
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
    const cluster = new Cluster(config.url, config)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const status = await cluster.status(cid)

    assert.equal(status.cid, cid)
    for (const pinInfo of Object.values(status.peerMap)) {
      assert.ok(
        ['pinning', 'pinned'].includes(pinInfo.status),
        `${pinInfo.status} is pinning or pinned`
      )
      assertField(pinInfo, 'ipfsPeerId')
    }
  })
})

describe('cluster.allocation', () => {
  it('gets pin allocation', async () => {
    const cluster = new Cluster(config.url, config)
    const file = new File(['foo'], 'foo.txt')
    const metadata = { meta: `test-${Date.now()}` }
    const { cid } = await cluster.add(file, { metadata })
    const allocation = await cluster.allocation(cid)
    assert.equal(allocation.metadata, metadata)
  })
})

describe('cluster.recover', () => {
  it('recovers an errored pin', async () => {
    const cluster = new Cluster(config.url, config)
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
    const cluster = new Cluster(config.url, config)
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const result = await cluster.unpin(cid)
    assert.ok(typeof result === 'object')
    // TODO: is there something we can assert on in the response?
  })
})

describe('cluster.metricNames', () => {
  it('gets metric names', async () => {
    const cluster = new Cluster(config.url, config)
    const names = await cluster.metricNames()
    assert.ok(Array.isArray(names))
    names.forEach((n) => assert.equal(typeof n, 'string'))
  })
})

describe('cluster auth', () => {
  /**
   *
   * @param {Promise<any>} input
   */
  const assertUnauthorized = async (input) => {
    const result = await input.catch((error) => error)
    assert.instance(result, Error)
    assert.match(result.message, /Unauthorized/)
  }

  it('requires auth (static)', async () => {
    await assertUnauthorized(cluster.version({ url: config.url }))
  })

  it('requires auth (method)', async () => {
    await assertUnauthorized(new Cluster(config.url).version())
  })
})

describe('cluster.info', () => {
  it('gets cluster id (static)', async () => {
    const info = await cluster.info(config)
    assertInfo(info)
  })

  it('gets cluster id (method)', async () => {
    const cluster = new Cluster(config.url, config)
    const info = await cluster.info()
    assertInfo(info)
  })
})

describe('cluster.peerList', () => {
  it('gets cluster peerList (static)', async () => {
    const list = await cluster.peerList(config)
    list.forEach(assertInfo)
  })

  it('gets cluster peerList (method)', async () => {
    const cluster = new Cluster(config.url, config)
    const list = await cluster.peerList()
    list.forEach(assertInfo)
  })
})

describe('cluster.statusAll', () => {
  it('gets all statuses', async () => {
    const cluster = new Cluster(config.url, config)
    const { cid } = await cluster.add(
      new File([`test-${Date.now()}`], 'test.txt')
    )

    let found = false
    const statuses = await cluster.statusAll()
    for (const status of statuses) {
      assertField(status, 'cid')
      if (status.cid === cid) {
        found = true
      }
      assert.ok(Object.entries(status.peerMap).length > 0, 'missing peers')
      for (const [, pinInfo] of Object.entries(status.peerMap)) {
        assertField(pinInfo, 'status')
        assertField(pinInfo, 'peerName')
      }
    }

    assert.ok(found, `added content not found in status list: ${cid}`)
  })

  it('gets statuses filtered by status', async () => {
    const cluster = new Cluster(config.url, config)
    // random junk - will not become pinned
    const junkCid = 'QmNm4jsipiQysHXZW5WHbH6RqPjGBnKPkagujXTPzpZ3zo'
    await cluster.pin(junkCid)

    try {
      let found = false
      /** @type {import('@nftstorage/ipfs-cluster').API.FilterTrackerStatus[]} */
      const filter = ['pin_queued', 'pinning', 'pin_error']
      const statuses = await cluster.statusAll({ filter })
      for (const status of statuses) {
        assertField(status, 'cid')
        if (status.cid === junkCid) {
          found = true
        }
        for (const [, pinInfo] of Object.entries(status.peerMap)) {
          assert.ok(filter.includes(pinInfo.status))
        }
      }

      assert.ok(found, `junk CID not found in status list: ${junkCid}`)
    } finally {
      await cluster.unpin(junkCid)
    }
  })

  it('gets statuses filtered by CID', async () => {
    const cluster = new Cluster(config.url, config)
    const f0 = await cluster.add(new File([`test0-${Date.now()}`], 'test0.txt'))
    const f1 = await cluster.add(new File([`test1-${Date.now()}`], 'test1.txt'))
    const f2 = await cluster.add(new File([`test2-${Date.now()}`], 'test2.txt'))

    const statuses = await cluster.statusAll({ cids: [f0.cid, f1.cid] })
    assert.equal(statuses.length, 2, 'returns status for 2 CIDs')
    for (const status of statuses) {
      assertField(status, 'cid')
      assert.not.equal(status.cid, f2.cid)
      assert.ok([f0.cid, f1.cid].includes(status.cid))
    }
  })
})

/**
 * @param {any} info
 * @param {string|number} key
 */
const assertField = (info, key) => {
  const value = info[key]
  assert.equal(
    typeof value,
    'string',
    `expected ${key} is string but is: ${typeof value}`
  )
  assert.ok((value.length || 0) > 0, `${key} is not empty`)
}

/**
 * @param {cluster.API.ClusterInfo} info
 */
const assertInfo = (info) => {
  assertField(info, 'id')
  assertField(info, 'version')
  assert.equal(typeof info.commit, 'string')
  assertField(info, 'peerName')
  assertField(info, 'rpcProtocolVersion')
  assert.ok(Array.isArray(info.addresses), 'addresses is array')
  assert.ok(Array.isArray(info.clusterPeers), 'clusterPeers is an array')
  assert.ok(
    Array.isArray(info.clusterPeersAddresses),
    'clusterPeersAddresses is array'
  )

  const { ipfs } = info

  assertField(ipfs, 'id')
  assert.ok(ipfs.addresses)
  assert.equal(typeof info.version, 'string', 'version is a string')
  assert.ok(info.version.length > 0, 'version is non empty string')
}
