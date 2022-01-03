const { isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread)
  process.exit()

const { query, timePicker, options } = workerData


const { Client } = require('@elastic/elasticsearch')
const pgp = require('pg-promise')

const q_seq = require('../query_sequencer')

const {
  esNodeUrl = process.env.ES_STRING || 'http://localhost:9200',
  dbURL = process.env.DB_QUERY || 'postgres://postgres:winwin@localhost:5432/postgres',

} = options

const esClient = new Client({ node: esNodeUrl })
const dbClient = pgp({})(dbURL)


q_seq.executeQuery(query, timePicker, { ...options, esClient, dbClient })
  .then(r => parentPort.postMessage(r))
  .finally(()=>{
    dbClient.$pool.end()
    esClient.close();
  })

