#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2), {
  alias: {
    t: 'token',
    o: 'output'
  }
})

const fs = require('fs')
const digitalCollections = require('digital-collections')
const H = require('highland')
const JSONStream = require('JSONStream')

const token = argv.t || process.env.DIGITAL_COLLECTIONS_TOKEN

function getImageUrls(capture) {
  const sizes = {
    w: 760,
    q: 1600,
    v: 2560
  }

  if (!capture || !capture.imageLinks || !capture.imageLinks.imageLink) {
    console.error(`No image URLs found for ${capture.id}`)
    return null
  }

  const links = capture.imageLinks.imageLink
  const urls = Object.keys(sizes)
    .filter((size) => links.filter((link) => link.includes(`&t=${size}`)).length)
    .map((size) => ({
      size: sizes[size],
      url: `http://images.nypl.org/index.php?id=${capture.imageID}&t=${size}`
    }))

  return urls
}

function toRow(capture) {
  return {
    provider: 'nypl',
    id: capture.uuid,
    title: capture.title,
    url: `http://digitalcollections.nypl.org/items/${capture.uuid}`,
    image_urls: getImageUrls(capture),
    meta: {
      image_id: capture.imageID
    },
    collection_id: capture.collection_id
  }
}

function getMODSLocation(mods) {
  if (!mods) {
    return null
  }

  var subject = mods.subject
  if (!Array.isArray(subject)) {
    subject = [subject]
  }

  var location = subject.filter((s) => s && s.geographic && s.geographic['$'])
    .map((s) => s.geographic['$'])
    .sort((a, b) => {
      return b.length - a.length
    })

  return location[0]
}

function getMODSDate(mods) {
  if (!mods) {
    return null
  }

  var originInfo = mods.originInfo
  if (!Array.isArray(originInfo)) {
    originInfo = [originInfo]
  }

  var date = originInfo.filter((o) => o.dateCreated || o.dateIssued || o.dateOther)
    .map((o) => o.dateCreated || o.dateIssued || o.dateOther)
    .filter((o) => o.keyDate)
    .map(o => o['$'])
    .sort((a, b) => {
      return b.length - a.length;
    })

  return date[0]
}

function modsToMetadata(mods) {
  return {
    location: getMODSLocation(mods),
    date: getMODSDate(mods)
  }
}

function getMODS(row, callback) {
  digitalCollections.mods({
    uuid: row.id,
    token: token
  }, (error, mods) => {
    if (error) {
      callback(error)
      return
    }

    row.meta = Object.assign(row.meta, modsToMetadata(mods))
    callback(null, row)
  })
}

function getCollection(collection) {
  return digitalCollections.captures({
    uuid: collection.uuid,
    token: token
  })
  .map((capture) => Object.assign(capture, {
    collection_id: collection.uuid
  }))
  .flatten()
}

H(require('./collections.json'))
  .map(getCollection)
  .flatten()
  .map(toRow)
  .map(H.curry(getMODS))
  .nfcall([])
  .series()
  .pipe(JSONStream.stringify())
  .pipe(argv.o ? fs.createWriteStream(argv.o, 'utf8') : process.stdout)
