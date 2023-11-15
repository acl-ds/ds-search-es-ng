
const { getMetricPartDSL } = require('./metric_dsl')


function createColName(specs) {
  let name = `${specs.field}`
  if (specs.name)
    name = specs.name

  if(specs.mode === 'histogram')
    name = `${name}___bin`

  return name
}

function prepareTermClause({ field, size = 100, orderBy = "_count", order = "desc" }) {
  return {
    terms: {
      field,
      size,
      order: { [orderBy]: order }
    }
  }
}

function prepareHistogramClause({ field, interval = 100, min_doc_count = 0 }) {
  return {
    histogram: {
      field,
      interval,
      min_doc_count
    }
  }
}

function prepareTimeSeriesClause({ field, interval, size:buckets, mode_i = "fixed" }) {

  let interval_c = {
    fixed_interval: interval,
  }

  if (mode_i === "calender") {
    interval_c = { calendar_interval: interval }
  }

  const mode = interval ? 'date_histogram' : 'auto_date_histogram'
  if( mode == 'date_histogram'){
    return { [mode]:{field, ...interval_c}}
  }

  if (!buckets)
    buckets = 10
  return {
    [mode]: {
      field,
      buckets
    }
  }
}

function getByAggregationDSL({ mode, ...specs }) {
  switch (mode) {
    case 'time_series': return prepareTimeSeriesClause(specs)
    case 'histogram': return prepareHistogramClause(specs)
    default: return prepareTermClause(specs)
  }
}

function getAggregation(name, body, aggs) {
  return { [name]: { ...body, aggs: aggs } }
}

function prepareAggregations(aggregationBody) {
  const { metric, by = [] } = aggregationBody

  let aggregations = getMetricPartDSL(metric)

  if(by){

    by.forEach(byTerm => {
      aggregations = getAggregation(createColName(byTerm), getByAggregationDSL(byTerm), aggregations)
    });
  }




  return aggregations

}

module.exports = { prepareAggregations,createColName }