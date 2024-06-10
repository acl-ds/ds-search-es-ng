
const { performance } = require('perf_hooks')

const { createDSL } = require('./dsl_generator')
const { tablify } = require('../utils/tablify')

let aggsSizeHistory = [];

function findAggsSize(size) {
  aggsSum = aggsSizeHistory.reduce((a, b) => a + b, 0);
  if (aggsSum >= size) return 0;
  if (size - aggsSum > 10000) return 10000;
  return size - aggsSum;
}

async function executeQuery(fresh,client, body, { indices },size) {
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
      console.log("ES Error: ",JSON.stringify(err))
      return { status: false, message: 'invalid request to data store', errorBody: err.meta.body }
    }
    console.log("ES Error: ",err.toString())
    return { status: false, message: 'data store unavailable,' + err.toString() }
  }
  if (
    resultFromES.body.aggregations &&
    resultFromES.body.aggregations.composite_agg &&
    resultFromES.body.aggregations.composite_agg.after_key &&
    body.aggs.composite_agg.composite.size < size
  ) {
    if(fresh)
      aggsSizeHistory.push(body.aggs.composite_agg.composite.size)
    body.aggs.composite_agg.composite.after =
      resultFromES.body.aggregations.composite_agg.after_key;

    body.aggs.composite_agg.composite.size =
      aggsSizeHistory[aggsSizeHistory.push(findAggsSize(size)) - 1];
    
    if (body.aggs.composite_agg.composite.size > 0) {
      const { result, took, status } = await executeQuery(
        false,
        client,
        body,
        { indices },
        size
      );
      if (status === true) {
        resultFromES.body.took += took;
        resultFromES.body.aggregations.composite_agg.buckets =
          resultFromES.body.aggregations.composite_agg.buckets.concat(
            result.aggregations.composite_agg.buckets
          );
      }
    }
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
  const {size,DSL} = createDSL(searchBody, aggreagationBody, timePicker, options)
  const DSLCreationTook = performance.now() - parseStartTime
  const { esClient, shouldTablify = true } = options
  aggsSizeHistory = [];
  const { result, took, status, errorBody } = await executeQuery(true,esClient, DSL, options,size)
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
          data.push(...tablify(processAggregatedResults(result.aggregations.composite_agg || result.aggregations)))
        else
          data.push(processAggregatedResults(result.aggregations))
      }

    }
  }

  const postProcessingTook = performance.now() - processingStartTime
  return { data, meta: { DSLCreationTook, DataStoreSearchTook: took, totalEvents: status ? result.hits.total : 0, postProcessingTook, took: DSLCreationTook + took + postProcessingTook, sort: status && result.hits.hits.length > 0 && result.hits.hits[result.hits.hits.length - 1].sort } }
}

module.exports = { process }