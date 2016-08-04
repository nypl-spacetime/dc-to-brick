var H = require('highland')
var R = require('ramda')
var pg = require('pg')

module.exports = function (databaseUrl) {
  function executeQuery (query, params, callback) {
    pg.connect(databaseUrl, (err, client, done) => {
      var handleError = (err) => {
        if (!err) {
          return false
        }

        if (client) {
          done(client)
        }

        callback(err)
        return true
      }

      if (handleError(err)) {
        return
      }

      client.query(query, params, (err, results) => {
        if (handleError(err)) {
          return
        }
        done()
        callback(null, results.rows)
      })
    })
  }

  function executeInsertQuery (table, row, callback) {
    var query = `
      INSERT INTO ${table} (${R.keys(row).join(', ')})
      VALUES (${R.keys(row).map((key, i) => `$${i + 1}`).join(', ')});
    `
    executeQuery(query, R.values(row), callback)
  }

  function fillTable (table, rows, callback) {
    const query = `
      TRUNCATE ${table} CASCADE;`

    executeQuery(query, null, (err) => {
      if (err) {
        callback(err)
      } else {
        H(rows)
          .map(H.curry(executeInsertQuery, table))
          .nfcall([])
          .series()
          .errors((err, push) => {
            if (err.code === '23505') {
              push(null, {})
            } else {
              console.log(err)
              push(err)
            }
          })
          .done(callback)
      }
    })
  }

  return {
    executeQuery,
    fillTable
  }
}
