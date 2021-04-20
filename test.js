import fetch from '@web-std/fetch'
import { FormData } from '@web-std/form-data'
import { File, Blob } from '@web-std/file'
import assert from 'assert'
import { Cluster } from './index.js'

Object.assign(global, { fetch, File, Blob, FormData })

// Run the test cluster quickstart to test:
// https://cluster.ipfs.io/documentation/quickstart/
// TODO: how to run on CI?
const URL = 'http://127.0.0.1:9094'
const AUTH = ''

const tests = {
  async 'adds a file' () {
    const cluster = new Cluster(URL, { auth: AUTH })
    const file = new File(['foo'], 'foo.txt')
    const result = await cluster.add(file)
    console.log(result)
    assert.strictEqual(result.name, file.name)
    assert.strictEqual(result.cid, 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu')
    assert.strictEqual(result.size, 11)
  },

  async 'adds a directory of files' () {
    const cluster = new Cluster(URL, { auth: AUTH })
    const files = [
      new File(['foo'], 'foo.txt'),
      new File(['bar'], 'bar.txt')
    ]
    const dir = await cluster.addDirectory(files)
    console.log(dir)

    assert.strictEqual(dir[0].name, files[0].name)
    assert.strictEqual(dir[0].size, 11)
    assert.strictEqual(dir[0].cid, 'bafybeigpsl667todjswabhelaxvwmk7amgg3txsv5tkcpbpj5rtrf6g7mu')

    assert.strictEqual(dir[1].name, files[1].name)
    assert.strictEqual(dir[1].size, 11)
    assert.strictEqual(dir[1].cid, 'bafybeidsnna57jpm2ttwaydwak25qpkxafrg4cnrjsfqipbcqxlsfobjje')

    // (wrapper directory)
    assert.strictEqual(dir[2].name, '')
    assert.strictEqual(dir[2].size, 128)
    assert.strictEqual(dir[2].cid, 'bafybeihdqdewefamqnvu7ih6t7pdam4wisengifqg3fv4jin76ax63hl3i')
  },

  async 'pins a CID' () {
    const cluster = new Cluster(URL, { auth: AUTH })
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const result = await cluster.pin(cid, { name: 'testy', metadata: { alan: 'tests' } })
    console.log(result)
    assert.strictEqual(result.cid, cid)
    assert.strictEqual(result.name, 'testy')
    assert.strictEqual(result.metadata.alan, 'tests')
  },

  async 'unpins a CID' () {
    const cluster = new Cluster(URL, { auth: AUTH })
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const result = await cluster.unpin(cid)
    console.log(result)
    // TODO: is there something we can assert on in the response?
  },

  async 'gets pin status' () {
    const cluster = new Cluster(URL, { auth: AUTH })
    const file = new File(['foo'], 'foo.txt')
    const { cid } = await cluster.add(file)
    const status = await cluster.status(cid)
    console.log(status)

    assert.strictEqual(status.cid, cid)
    for (const pinInfo of Object.values(status.peerMap)) {
      assert.strictEqual(pinInfo.status, 'pinned')
    }
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
