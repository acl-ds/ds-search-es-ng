
const { getMetricPartDSL } = require('./metric_dsl')


function createColName(specs) {
  let name = `${specs.field}`
  if (specs.name)
    name = specs.name

  if(specs.mode === 'histogram')
    name = `${name}___bin`

  return name
}

function prepareTermClause({ field },FIELDS) {
  if (FIELDS.includes(field)) {
    return {
      terms: {
        script: {
          source: `if (doc.containsKey('${field}') && doc['${field}'].size() > 0 && doc['${field}'].value instanceof Number) {DecimalFormat df = new java.text.DecimalFormat('0');return df.format(doc['${field}'].value);} else {return doc['${field}'];}`,
        },
      },
    };
  } else {
    return {
      terms: {
        field
      },
    };
  }
}

function prepareHistogramClause({ field, interval = 150, min_doc_count = 0 }) {
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

function getByAggregationDSL({ mode, ...specs },FIELDS) {
  switch (mode) {
    case 'time_series': return prepareTimeSeriesClause(specs)
    case 'histogram': return prepareHistogramClause(specs)
    default: return prepareTermClause(specs,FIELDS)
  }
}

function getAggregation(name, body, aggs, metric,isHistogram, size) {
  if (metric === "count" && !isHistogram) {
    let sources = [];
    if (aggs.composite_agg) sources = aggs.composite_agg.composite.sources;
    sources.push({ [name]: body });
    return {
      composite_agg: {
        composite: { size: size > 10000 ? 10000 : size, sources },
      },
    };
  }
  return { [name]: { ...body, aggs: aggs } };
}

function prepareAggregations(aggregationBody,size,isHistogram,FIELDS) {
  const { metric, by = [] } = aggregationBody

  let aggregations = getMetricPartDSL(metric)

  if(by){

    by.forEach(byTerm => {
      if (byTerm.mode === "time_series" || byTerm.mode === "histogram") {
        aggregationBody.isHistogram = true;
      }
      aggregations = getAggregation(createColName(byTerm), getByAggregationDSL(byTerm,FIELDS), aggregations,aggregationBody.metric,isHistogram,size)
    });
  }




  return {aggregations};

}

module.exports = { prepareAggregations,createColName }