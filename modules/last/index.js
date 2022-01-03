const { performance } = require('perf_hooks')

async function execute(command, head, options = {}) {
  const startTime = performance.now()

  const { count = 1 } = command
  head.data = head.data.slice(Math.max(head.data.length - count, 0))

  head.meta.push({ processor: 'last',took: performance.now() - startTime })
}

module.exports = execute