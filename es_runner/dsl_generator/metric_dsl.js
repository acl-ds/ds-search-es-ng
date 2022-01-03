
const { prepareQueryFilter } = require('./utils')

const getGenericFieldFromParams = params => typeof params === typeof '' ? params : (params.field || '')

function createMetricFunction({ params, fun }) {

  const genericField = getGenericFieldFromParams(params)

  switch (fun) {
    case 'dc': return { cardinality: { field: genericField } }
    case 'e_stats': return { extended_stats: { field: genericField } }
    case 'hits': return { top_hits: { _source: params.cols, size: params.count } }
    case 'count_if': return { filter: { query_string: { query: prepareQueryFilter(genericField) } } }
    case 'median': return { percentiles: { field: genericField, percents: [50] } }
    case 'der': return { derivative: { buckets_path: genericField === 'count' ? '_count' : genericField } }
    default: return { [fun]: { field: genericField } }
  }
}

function createColName(specs) {
  if (specs.fun === 'hits')
    return '_hits'
  if (['stats', 'e_stats'].includes(specs.fun))
    return '_stats_' + getGenericFieldFromParams(specs.params)

  if (specs.name)
    return specs.name
  return `${specs.fun}_${getGenericFieldFromParams(specs.params.replace('.', '_'))}`
}

function getMetricPartDSL({ metric_functions = [] }) {


  const aggreagations = {}

  metric_functions.forEach(metricFunction => {
    aggreagations[createColName(metricFunction)] = createMetricFunction(metricFunction)
  })

  return aggreagations
}

module.exports = { getMetricPartDSL, createColName }