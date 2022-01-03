

const { createColName: metricCreateColName } = require('../es_runner/dsl_generator/metric_dsl')
const { createColName: byCreateColName } = require('../es_runner/dsl_generator/aggregations')


function extractFieldsFromAggregate(aggsBody) {
  const { metric, by } = aggsBody

  const f = []
  if (metric === 'count')
    f.push({ type: 'number', name: 'count' })
  else {
    metric.metric_functions.forEach(metricFunction => {
      f.push({ type: 'number', name: metricCreateColName(metricFunction) })
    });
  }

  by.forEach(byFunction => {
    f.push({ type: 'general', name: byCreateColName(byFunction) })
  })

  return f
}

function extractFieldsFromSelect({ include, exclude }) {
  if (include === '_all')
    return false

  const returnList = []
  include.forEach(inc => {
    returnList.push({ type: 'general', name: inc.rename || inc.name })
  })

  return returnList
}

function extractAndOutProperties({ properties }, output = [], prefix = '') {
  if (properties) {
    Object.entries(properties).forEach((([name, props]) => {
      const n = `${prefix}${name}`
      if (props.properties)
        extractAndOutProperties(props, output, `${n}.`)
      else
        output.push({ name: n, type: props.type })
    }))
  }
}

const indexCache = { index: '', fields: [] }
async function extractFieldsFromSearch(searchBody, { esClient }) {

  const { index } = searchBody
  if (indexCache.index === index)
    return indexCache.fields
  const fieldNames = []
  try {
    const { statusCode, body } = await esClient.indices.getMapping({ index, ignore_unavailable: true, master_timeout: '5s' })
    if (statusCode === 200) {
      Object.values(body).forEach(({ mappings }) => {
        extractAndOutProperties(mappings, fieldNames)
      })
    }
  } catch (x) { console.log(x) }

  indexCache.index = index
  indexCache.fields = fieldNames
  return fieldNames
}

async function identifyFieldNames(parsedQuery = [], type = "all", options) {
  /*
    Field name expect { type, name }, based on previous functions and entries
  */
  const fieldNames = []

  for (const query of parsedQuery.reverse()) {
    if (query.statement === 'aggregate') {
      fieldNames.push(...extractFieldsFromAggregate(query.body))
      break;
    }
    else if (query.statement === 'select') {
      const x = extractFieldsFromSelect(query)
      if (x) {
        fieldNames.push(...x)
        break;
      }
    }
    else if (query.statement === 'calc') {
      const { evals } = query
      evals.forEach(eval => {
        fieldNames.push({ type: 'calculated_general', name: eval.out })
      })
    }
    else if (query.statement === 'search') {
      fieldNames.push(...await extractFieldsFromSearch(query.body, options))
    }
  }
  return fieldNames
}

module.exports = { identifyFieldNames, extractFieldsFromSearch }