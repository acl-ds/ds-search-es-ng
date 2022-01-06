
const express = require('express')
const path = require('path')
const app = express()
app.use(express.json())
// app.use(express.urlencoded({ extended: false }));
const port = 8500


const { Client } = require('@elastic/elasticsearch')
const pgp = require('pg-promise')
const {
  esNodeUrl = process.env.ES_STRING || 'http://devl.acl:9200',
  dbURL = process.env.DB_QUERY ,

} = {}

const esClient = new Client({ node: esNodeUrl })
const dbClient = pgp({})(dbURL)


const q = require('./query_sequencer')
const suggest =  require('./auto_complete')

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'test_assets', 'index.html'),);
});

app.post('/', async (req, res) => {
  const { query, timePicker, display } = req.body

  const queryObject = {
    query,
    timePicker,
    options: {}
  }
  console.log('Processing Request')
  if(display === 'suggest'){
    res.json(await suggest(query,{ esClient, dbClient, ...queryObject.options }))
  }else{
    res.json(await  q.executeQuery(queryObject.query, queryObject.timePicker, { esClient, dbClient, ...queryObject.options }))
  }
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))