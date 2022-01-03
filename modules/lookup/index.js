const { performance } = require('perf_hooks')

const _ = require('lodash')

const { resolveObject } = require('../../utils/function')

const { prepareCachedList, getCachedList } = require('./cache')

function prepareListOfField(command) {
  const { list: { field } } = command
  return field
}

function preapreLookupFunction(command, currentRecord) {
  const { list: { field }, field: f, } = command
  return (x => x[field] == resolveObject(currentRecord, f))
}


async function processLookup(data, command, index, { esClient, dbClient }) {
  const { list, list: { field }, field: f, action } = command
  const returnData = []
  let lookupList = getCachedList(index)

  if (action === "list")
    return lookupList

  if (lookupList.length > 1000) {
    lookupList = _.uniqBy(lookupList, prepareListOfField(command))
  }
  for (record of data) {
    const lookup = preapreLookupFunction(command, record)
    const lResult = _.find(lookupList, lookup)
    if (lResult)
      returnData.push({ ...lResult, ...record })
    else if (action === 'merge') {
      returnData.push(record)
    }
  }

  return returnData
}

async function execute(command, head, options = {}) {
  const startTime = performance.now()
  if (!command.list.field) {
    command.list.field = command.field
  }

  const index = await prepareCachedList(command, options)

  const result = await processLookup(head.data, command, index, options)

  head.data = result

  head.meta.push({ processor: 'lookup', took: performance.now() - startTime })
}

module.exports = execute