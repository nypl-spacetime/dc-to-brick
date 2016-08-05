#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2), {
  alias: {
    d: 'database'
  }
})

const DATABASE_URL = argv.d || 'postgres://postgres:postgres@localhost:5432/surveyor'
const db = require('./db')(DATABASE_URL)

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

const items = require('./data/items.json')
  .filter((item) => collectionsMap[item.collection_id])
  .map((item) => {
    item.image_urls = JSON.stringify(item.image_urls)
    return item
  })

function fillCollections (callback) {
  db.fillTable('collections', collections, (err) => {
    if (err) {
      console.error('Error filling collections table: ', err.message)
      process.exit(1)
    }

    if (callback) {
      callback()
    }
  })
}

function fillItems (callback) {
  db.fillTable('items', items, (err) => {
    if (err) {
      console.error('Error filling items table: ', err.message)
      process.exit(1)
    }

    if (callback) {
      callback()
    }
  })
}

fillCollections(() => {
  fillItems()
})
