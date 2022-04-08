# Changelog

### [5.0.1](https://www.github.com/nftstorage/ipfs-cluster/compare/v5.0.0...v5.0.1) (2022-04-08)


### Bug Fixes

* no more object with slash for CID ([#42](https://www.github.com/nftstorage/ipfs-cluster/issues/42)) ([e078957](https://www.github.com/nftstorage/ipfs-cluster/commit/e078957a03202871f3320813f226fadf0d75fd82))

## [5.0.0](https://www.github.com/nftstorage/ipfs-cluster/compare/v4.1.0...v5.0.0) (2022-04-04)


### ⚠ BREAKING CHANGES

* The client is not compatible with Cluster pre v1.0 anymore. Note: there are no changes to the programmatic API.

### Features

* cluster v1.0 support ([#40](https://www.github.com/nftstorage/ipfs-cluster/issues/40)) ([fd965ad](https://www.github.com/nftstorage/ipfs-cluster/commit/fd965ad652b3243cbf6e1dbcc9c4a0a38caffea8))

## [4.1.0](https://www.github.com/nftstorage/ipfs-cluster/compare/v4.0.0...v4.1.0) (2022-03-23)


### Features

* add peerList method ([#38](https://www.github.com/nftstorage/ipfs-cluster/issues/38)) ([74dfd77](https://www.github.com/nftstorage/ipfs-cluster/commit/74dfd779329045d093267cf3a819ff9a8d73af2f))

## [4.0.0](https://www.github.com/nftstorage/ipfs-cluster/compare/v3.5.0...v4.0.0) (2022-02-07)


### ⚠ BREAKING CHANGES

* Types for `TrackerStatus` and `PinType` have changed from `enum` to string union. There are no runtime API alterations (only additions) so unless you're using those types directly in your project then you'll probably not notice any change.

### Features

* add statusAll method ([#35](https://www.github.com/nftstorage/ipfs-cluster/issues/35)) ([193be66](https://www.github.com/nftstorage/ipfs-cluster/commit/193be662d8a80e670fc668139699d5a72a513ff1))


### Bug Fixes

* wait longer for Cluster ready ([1d434cb](https://www.github.com/nftstorage/ipfs-cluster/commit/1d434cb61e0a14e5ef849ba04bacfa629ccc01d9))

## [3.5.0](https://www.github.com/nftstorage/ipfs-cluster/compare/v3.4.3...v3.5.0) (2022-01-27)


### Features

* add info api ([#29](https://www.github.com/nftstorage/ipfs-cluster/issues/29)) ([ceb5f85](https://www.github.com/nftstorage/ipfs-cluster/commit/ceb5f855e9ef3d3d8d5edc88c2d7b4ceb7a91271))


### Bug Fixes

* default fetch method to GET ([#32](https://www.github.com/nftstorage/ipfs-cluster/issues/32)) ([980cecf](https://www.github.com/nftstorage/ipfs-cluster/commit/980cecfe2731700fe594ca181a548172cc64f17e))
* lock ipfs version until fixed ([#33](https://www.github.com/nftstorage/ipfs-cluster/issues/33)) ([00605d2](https://www.github.com/nftstorage/ipfs-cluster/commit/00605d27d773b52ecccaf06b87a813bfe909b83e))

### [3.4.3](https://www.github.com/nftstorage/ipfs-cluster/compare/v3.4.2...v3.4.3) (2021-10-25)


### Bug Fixes

* pass headers ([#23](https://www.github.com/nftstorage/ipfs-cluster/issues/23)) ([732ad49](https://www.github.com/nftstorage/ipfs-cluster/commit/732ad49dcf5a4d8ba73fd79ecb369618006bc481))

### [3.4.2](https://www.github.com/nftstorage/ipfs-cluster/compare/v3.4.1...v3.4.2) (2021-10-25)


### Bug Fixes

* typo in release script ([#21](https://www.github.com/nftstorage/ipfs-cluster/issues/21)) ([0a4bd8c](https://www.github.com/nftstorage/ipfs-cluster/commit/0a4bd8cb5fabdec684fdee069bed4f525980bec1))

### [3.4.1](https://www.github.com/nftstorage/ipfs-cluster/compare/v3.4.0...v3.4.1) (2021-10-25)


### Bug Fixes

* expose `local` option ([#18](https://www.github.com/nftstorage/ipfs-cluster/issues/18)) ([037786b](https://www.github.com/nftstorage/ipfs-cluster/commit/037786b6790ff8ae4d4ee797235475d4a8e58096))

## [3.4.0](https://www.github.com/nftstorage/ipfs-cluster/compare/v3.3.1...v3.4.0) (2021-10-22)


### Features

* implement static api ([#15](https://www.github.com/nftstorage/ipfs-cluster/issues/15)) ([21c5f35](https://www.github.com/nftstorage/ipfs-cluster/commit/21c5f35fca4ad7f69d1ef5ad5af1d765117e0fa2))
* make car imports explicit ([#14](https://www.github.com/nftstorage/ipfs-cluster/issues/14)) ([9394b9c](https://www.github.com/nftstorage/ipfs-cluster/commit/9394b9c132eb722a76951a09aa87a7c98ac0d46f))
* setup test infra ([#13](https://www.github.com/nftstorage/ipfs-cluster/issues/13)) ([3f86a4c](https://www.github.com/nftstorage/ipfs-cluster/commit/3f86a4cdfd4b3b098ac6d250a43ffb88b8461d84))
