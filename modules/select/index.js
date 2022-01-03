const { performance } = require('perf_hooks')

const { resolveObject } = require('../../utils/function')

function mapper(entry, command) {
  let returnObject = {}
  const { include, exclude } = command

  if (include === '_all') {
    returnObject = entry
  } else {
    include && include.forEach(({ name, rename }) => {
      const entryVal = resolveObject(entry, name)
      if (entryVal !== undefined)
        returnObject = { ...returnObject, [rename || name]: entryVal }
    })
  }

  exclude && exclude.forEach(({ name }) => {
    if (returnObject[name])
      delete (returnObject[name])
  })

  return returnObject
}

async function execute(command, head, options = {}) {
  const startTime = performance.now()
  head.data = head.data.map(item => mapper(item, command, options))
  head.meta.push({ processor: 'select', took: performance.now() - startTime })
}

module.exports = execute