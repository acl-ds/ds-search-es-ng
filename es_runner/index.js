
const { performance } = require('perf_hooks')

const { createDSL } = require('./dsl_generator')
const { tablify } = require('../utils/tablify')

async function executeQuery(client, body, { indices }) {
  if (!client)
    return { status: false, message: 'client not configured' }

  let resultFromES = {}
  try {
    resultFromES = await client.search({
      index: indices,
      body,
      rest_total_hits_as_int: true,
    })
  }
  catch (err) {
    if (err.meta && err.meta.statusCode >= 400) {
      return { status: false, message: 'invalid request to data store', errorBody: err.meta.body }
    }
    return { status: false, message: 'data store unavailable,' + err.toString() }
  }


  return { result: resultFromES.body, took: resultFromES.body.took, status: true, message: 'data store query completed' }
}

function processSearchResults(hits = []) {
  return hits.map(({ _index: index, _id, _source, _scroll }) => ({ index, _id, ..._source, _scroll }))
}

//Aggs functions

function prepareValueObject(valueObjectRef, name) {
  if (valueObjectRef.buckets !== undefined) {
    // this is a bucket aggregation
    const data = []
    valueObjectRef.buckets.forEach(({ key, key_as_string, doc_count, ...aggregations }) => {
      const { interval } = valueObjectRef
      const dataToPush = { key: key_as_string || key, count: doc_count, interval }
      Object.entries(aggregations).forEach(([name, valueObject]) => {
        dataToPush[name] = prepareValueObject(valueObject, name)
      })
      data.push(dataToPush)
    })
    return data
  }

  if (valueObjectRef.doc_count !== undefined)
    return valueObjectRef.doc_count
  if (valueObjectRef.value !== undefined && !Array.isArray(valueObjectRef.value))
    return valueObjectRef.value

  if (name === '_hits') {
    return valueObjectRef.hits.hits.map(({ _source, _id: id }) => ({ ..._source, id }))
  }
  return valueObjectRef
}

function processAggregatedResults(aggregations) {

  const root = {}

  Object.entries(aggregations).forEach(([name, valueObject]) => {
    root[name] = prepareValueObject(valueObject, name)
  })

  return [root,]
}

async function process(searchBody, aggreagationBody, timePicker, options) {
  const parseStartTime = performance.now()
  const ES_DSL = createDSL(searchBody, aggreagationBody, timePicker, options)
  const DSLCreationTook = performance.now() - parseStartTime
  const { esClient, shouldTablify = true } = options
  const { result, took, status, errorBody } = await executeQuery(esClient, ES_DSL, options)
  const processingStartTime = performance.now()
  const data = []
  if (status === true) {
    if (!aggreagationBody)
      data.push(...processSearchResults(result.hits.hits))
    else {
      if (aggreagationBody.metric === 'count' && !aggreagationBody.by) {
        data.push(result.hits)
      } else {
        if (shouldTablify)
          data.push(...tablify(processAggregatedResults(result.aggregations)))
        else
          data.push(processAggregatedResults(result.aggregations))
      }

    }
  }

  const postProcessingTook = performance.now() - processingStartTime
  return { data, meta: { DSLCreationTook, DataStoreSearchTook: took, totalEvents: status ? result.hits.total : 0, postProcessingTook, took: DSLCreationTook + took + postProcessingTook, sort: status && result.hits.hits.length > 0 && result.hits.hits[result.hits.hits.length - 1].sort } }
}

module.exports = { process }