const { flattenObject } = require('../../utils/function')

const _ = require('lodash')

const cache = {}

function isMergeCommand(command) {
  return command.action === "list" || command.action.indexOf('merge') > -1
}
async function prepareIndexName({ mode = 'list', name, field }, dbClient) {
  if (mode === 'asset_db') {
    return `___assetDB:${name}`
  } else if (mode === 'alliance') {
    return 'ds_main_feed'
  } else if (mode === 'list') {
    try {
      const listDetails = await dbClient.one('select * from ds_lists where "listName"=${name}', { name })
      return listDetails.index
    } catch (err) {
      console.log(err)
    }
  }
  else if (mode === 'feed') {
    try {
      const listDetails = await dbClient.one('select * from ds_feeds where "feedName"=${name}', { name })
      return listDetails.index
    } catch (err) {
      console.log(err)
    }
  }

  return name
}

async function preapreESIndexData(listIndex, fields = ['*'], { esClient }, retry = true) {
  if (!esClient)
    return []
  try {
    
    const { body: { hits: { total, hits }} } = await esClient.search({
      index: listIndex,
      size: 100000,
      body: {
        _source: fields,
      }
    })
    if (total.value > 0) {
      return hits.map(i => flattenObject(i._source))
    }

  }
  catch (err) {
    if(retry && err.message === 'search_phase_execution_exception' ){
      await esClient.indices.putSettings({ index: listIndex, body : { 'max_result_window' : 100000  }})
      return preapreESIndexData(listIndex,fields,{ esClient },false)
    }
  }

  return []
}

async function prepareAssetDBData(listIndex, fields = ['*'], { dbClient }) {
  if (!dbClient)
    return
  const select_fields = fields[0] === '*' ? '*' : fields.reduce((acc, cur) => `${acc},"${cur}"`)

  try {
    const result = await dbClient.any(`select ${select_fields} from ds_asset_management`)
    return result.map(i => flattenObject(i))
  } catch (err) {
    console.log({ err })
  }
  return []
}

function prepareFieldList(command, isMerge) {
  if (isMerge) {
    return ['*']
  }
  else {
    return [command.list.field]
  }
}

async function prepareCachedList(command, injections) {
  const { dbClient, esClient } = injections
  const isMerge = isMergeCommand(command)

  const listLndex = await prepareIndexName(command.list, dbClient)

  const fields = prepareFieldList(command, isMerge)

  if (listLndex.startsWith('___assetDB')) {
    // Asset DB
    cache[listLndex] = await prepareAssetDBData(listLndex, fields, { dbClient })
  } else {
    // Do elasticQuery
    cache[listLndex] = await preapreESIndexData(listLndex, fields, { esClient })
  }

  return listLndex
}

function getCachedList(index) {
  return cache[index] || []
}

module.exports = { getCachedList, prepareCachedList, prepareIndexName, isMergeCommand }