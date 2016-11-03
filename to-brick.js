#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const H = require('highland')
const brickDb = require('to-brick')

const DATA_DIR = path.join(__dirname, 'data')
const ORGANIZATION_ID = 'nypl'

const TASKS = [
  {
    id: 'geotag-photo',
    submissionsNeeded: 10
  },
  {
    id: 'select-toponym',
    submissionsNeeded: 5
  }
]

const collections = require(path.join(DATA_DIR, 'collections.json'))
  .filter((collection) => collection.include)
  .map((collection) => ({
    organization_id: ORGANIZATION_ID,
    tasks: TASKS,
    id: collection.uuid,
    title: collection.title,
    url: collection.url
  }))

const collectionsMap = {}
collections.forEach((collection) => {
  collectionsMap[collection.id] = true
})

H(fs.createReadStream(path.join(DATA_DIR, 'items.ndjson')))
  .split()
  .compact()
  .map(JSON.parse)
  .map((item) => Object.assign({
    organization_id: ORGANIZATION_ID
  }, item))
  .filter((item) => collectionsMap[item.collection_id])
  .toArray((items) => {
    const tasks = TASKS
      .map((task) => ({
        id: task.id
      }))

    brickDb.addAll(tasks, collections, items, true)
  })
