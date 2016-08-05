#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2), {
  alias: {
    d: 'database'
  }
})

const DATABASE_URL = argv.d || 'postgres://postgres:postgres@localhost:5432/surveyor'
const db = require('./db')(DATABASE_URL)
const fs = require('fs')
const H = require('highland')

const collections = require('./data/collections.json')
  .filter((collection) => collection.include)
  .map((collection) => ({
    provider: 'nypl',
    id: collection.uuid,
    title: collection.title,
    url: collection.url
  }))

const collectionsMap = {}
collections.forEach((collection) => {
  collectionsMap[collection.id] = true
})

function fillCollections (callback) {
  db.fillTable('collections', collections, (err) => {
    if (err) {
      console.error('Error filling collections table: ', err.message)
      process.exit(1)
    }

    console.log(`Done filling collections table - ${collections.length} collections added!`)
    callback()
  })
}

function fillItems () {
  H(fs.createReadStream('./data/items.ndjson'))
    .split()
    .map(JSON.parse)
    .filter((item) => collectionsMap[item.collection_id])
    .map((item) => {
      // pg converts arrays to Postgres array - but we want JSON array!
      item.image_urls = JSON.stringify(item.image_urls)
      return item
    })
    .toArray((items) => {
      db.fillTable('items', items, (err) => {
        if (err) {
          console.error('Error filling items table: ', err.message)
          process.exit(1)
        }

        console.log(`Done filling items table - ${items.length} items added!`)
      })
    })
}

fillCollections(() => {
  fillItems()
})
