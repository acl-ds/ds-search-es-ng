const { performance } = require('perf_hooks')


async function execute(command, head, options = {}) {
  const startTime = performance.now()

  const { count = 1 } = command
  head.data = head.data.slice(0, count)
  
  head.meta.push({ processor: 'first', took: performance.now() - startTime })
}

module.exports = execute