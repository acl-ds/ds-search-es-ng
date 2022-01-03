

const { prepareAggregations } = require('./aggregations')

const { prepareQueryFilter } = require('./utils')

const BATCH_REDUCE_SIZE = 128
const CONCURRENT_SHARDS = 5



function createDSL(searchBody, aggregationBody, timePicker, { search_after, customerFilter }) {
  const { index, query, size, order, timeField: tf, searchMode = 'default', bypassTimeFilter = false } = searchBody
  let { orderBy } = searchBody
  const { field: timeField = tf, filter: timeFilter = { gte: 'now-5d', lte: 'now' } } = timePicker

  const queryString = `_index : (${index.split(',').join(' OR ')})${query !== '*' ? ' AND ( ' + prepareQueryFilter(query) + ' )' : ''}`


  const aggs = aggregationBody ? prepareAggregations(aggregationBody) : undefined

  const filter = []
  if (!bypassTimeFilter) {
    filter.push({
      range: {
        [timeField]: timeFilter
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
    size: aggs ? 0 : size,
    sort: orderBy && order ? [{ [orderBy]: { order, } }] : undefined,
    aggs,
    search_after,
  }

  return DSL
}

module.exports = { createDSL, prepareQueryFilter }