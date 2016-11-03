#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const H = require('highland')
const brickDb = require('to-brick')

const DATA_DIR = 'data'
const ORGANIZATION_ID = 'nypl'

const TASKS = [
  {
    task: 'geotag-photo',
    submissionsNeeded: 10
  },
  {
    task: 'select-toponym',
    submissionsNeeded: 5
  }
]

const collections = require(`./${DATA_DIR}/collections.json`)
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

H(fs.createReadStream(path.join(__dirname, DATA_DIR, 'items.ndjson')))
  .split()
  .compact()
  .map(JSON.parse)
  .map((item) => Object.assign({
    organization_id: ORGANIZATION_ID
  }, item))
  .filter((item) => collectionsMap[item.collection_id])
  .toArray((items) => {
    const tasks = TASKS
      .map((task) => ([
        task.task, // task ID
        null  // task description -- empty, for now
      ]))

    brickDb.addTasks(tasks)
      .then(() => {
        console.log(`Done adding ${tasks.length} tasks`)
        return brickDb.addCollections(collections)
      })
      .then(() => {
        console.log(`Done adding ${collections.length} collections`)
        return brickDb.addItems(items)
      })
      .then(() => {
        console.log(`Done adding ${items.length} items`)
      })
      .catch((err) => {
        console.error(`Error: ${err.message}`)
      })
  })
