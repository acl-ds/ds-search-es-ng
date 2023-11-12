const { performance } = require('perf_hooks')


async function execute(command, head, options = {}) {
  const startTime = performance.now()

  const { operation, variable } = command

  if(['push','save'].includes(operation))
    head.stack[variable] = head.data
  else{
    const stackData = head.stack[variable]
    if(stackData)
      head.data = [...head.data,...stackData]
  }
  
  if(operation === 'push')
    head.data = []
  if(['pop','clear'].includes(operation))
    delete(head.stack[variable])
  
  head.meta.push({ processor: 'stack_ops', took: performance.now() - startTime })
}

module.exports = execute

