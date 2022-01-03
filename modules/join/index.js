const { performance } = require('perf_hooks')

function fullJoin(command, head, options) {
  const { left, right, stack } = command
  const stackData = head.stack[stack] || []
  const returnData = []
  head.data.forEach((data) => {
    stackData.some(sData => {
      if (data[left] == sData[right]){
        returnData.push({ ...data, ...sData })
        return true
      }
    })
  });
  head.data = returnData
}

function leftJoin(command, head, options) {
  const { left, right, stack } = command
  const stackData = head.stack[stack] || []

  const returnData = []
  head.data.forEach(data => {
    stackData.some(sData => {
      if (data[left] == sData[right]){
        data = { ...data, ...sData }
        return true
      }
    })
    returnData.push(data)
  })

  head.data = returnData
}

function rightJoin(command, head, options) {
  const { left, right, stack } = command
  const stackData = head.stack[stack] || []
  const returnData = []
  stackData.forEach(data => {
    head.data.some(sData => {
      if (data[left] == sData[right]){
        data = { ...sData, ...data }
        return true
      }
    })
    returnData.push(data)
  })
  head.data = returnData
}

async function execute(command, head, options = {}) {
  const startTime = performance.now()

  const { mode } = command
  switch (mode) {
    case 'left': leftJoin(command, head, options); break
    case 'right': rightJoin(command,head,options);break;
    default: fullJoin(command, head, options)
  }

  head.meta.push({ processor: 'join', took: performance.now() - startTime })
}

module.exports = execute