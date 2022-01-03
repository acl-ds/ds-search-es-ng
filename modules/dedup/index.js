const { performance } = require('perf_hooks')

const _ = require('lodash')

async function execute(command, head, options = {}) {
  const startTime = performance.now()
  
  const {fields = []} = command
  fields.forEach(field => {
    head.data = _.uniqBy(head.data,field.name)
  });

  head.meta.push({ processor: 'dedup', took: performance.now() - startTime })
}

module.exports = execute