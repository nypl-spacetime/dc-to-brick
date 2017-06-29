# Digital Collections to brick-by-brick

1. Reads items & MODS data from Digital Collections, outputs [brick-by-brick](https://github.com/nypl-spacetime/brick-by-brick) data
2. Imports data into brick-by-brick database

dc-to-brick uses [to-brick](https://github.com/nypl-spacetime/to-brick) to write collections and items to the brick-by-brick database (local and remote),

## Usage

    npm install

    node from-dc.js > data/items.ndjson
    node to-brick.js

By default, dc-to-brick uses the following connection string to connect to PostgreSQL:

    postgres://postgres:postgres@localhost:5432/brick-by-brick

To connect to a different database, use the `-d` command line argument:

    node to-brick.js -d "postgres://user:password@host:port/database"
