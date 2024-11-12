

const { prepareAggregations } = require('./aggregations')

const { prepareQueryFilter } = require('./utils')

const datemath=require("@elastic/datemath")


function isValidUTC(utcString) {
  const date = new Date(utcString);

  if (isNaN(date.getTime())) {
    return false;
  }

  const isoString = date.toISOString();
  return isoString === utcString;
}

function convertTimeIfNotation(date) {
  if(isValidUTC(date))
    {
      return date
    }
    else {
      const parsedDate=datemath.parse(date)
      return parsedDate._isValid?parsedDate.toISOString():new Date().toISOString()
    }
}

function preparetimeFilter(timeFilter) {
  const { gte, lte } = timeFilter;
  if (gte && lte) {
    return {
      gte: convertTimeIfNotation(gte),
      lte: convertTimeIfNotation(lte),
    };
  } else timeFilter;
}

const BATCH_REDUCE_SIZE = 128
const CONCURRENT_SHARDS = 5



function createDSL(searchBody, aggregationBody, timePicker, { search_after, customerFilter,size=25,from },isHistogram,FIELDS) {
  
  const { index, query, order, timeField: tf, searchMode = 'default', bypassTimeFilter = false,size:querySize } = searchBody
  let { orderBy } = searchBody
  size=querySize?querySize:size
  const { field: timeField = tf, filter: timeFilter = { gte: 'now-5d', lte: 'now' } } = timePicker

  const queryString = `_index : (${index.split(',').join(' OR ')})${query !== '*' ? ' AND ( ' + prepareQueryFilter(query) + ' )' : ''}`


  var aggs = undefined;
  if (aggregationBody) {
    var { aggregations:aggs } = prepareAggregations(
      aggregationBody,
      size,
      isHistogram,
      FIELDS
    );
  }

  const filter = []
  if (!bypassTimeFilter) {
    filter.push({
      range: {
        [timeField]: preparetimeFilter(timeFilter)
      }
    })
  }
  if (customerFilter)
    filter.push(customerFilter)

  if (bypassTimeFilter && orderBy === '@timestamp')
    orderBy = undefined

  const DSL = {
    query: {
      bool: {
        must: [
          {
            query_string: {
              query: queryString,
              analyze_wildcard: true,
              default_field: '*',
              allow_leading_wildcard: true,
              default_operator: 'AND',
            }
          }
        ],
        filter
      },
    },
    size: aggs ? 0 : size===null?undefined:size,
    from: aggs ? 0 : from===null?undefined:from,
    sort: orderBy && order ? [{ [orderBy]: { order, } }] : undefined,
    aggs,
    search_after,
  }
  console.log("DSL -> ", JSON.stringify(DSL))
  return {DSL,size}
}

module.exports = { createDSL, prepareQueryFilter }