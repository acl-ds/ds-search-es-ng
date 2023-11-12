const { performance } = require('perf_hooks')

const functions = require('./functions')

function executeExprFunction(expr, item, options) {
  const { fun, args } = expr
  const resolvedArgs =  args.map(arg => filter_expr(arg,item,options) )
  if(typeof functions[fun] === 'function')
    return functions[fun](...resolvedArgs)
  return false;
}

function executeExprFilter(expr, item, options) {
  const left = filter_expr(expr.left, item, options)
  const right = filter_expr(expr.right, item, options)
  let { operator } = expr

  if(operator === '=')
    operator+='='
  return eval(`left ${operator} right`)
}

function filter_expr(filter, item, options) {

  const {type} = filter
  if(type === 'filter_bool')
    return executeExprFilter(filter,item,options)
  if(type === 'filter_function')
    return executeExprFunction(filter,item,options)
  else if(type === 'NOT')
    return executeExprFilter({left:true,right:filter.operand,operator:'!='},item,options)
  else if (type === 'literal')
    return filter.value
  else if (type === 'field_name')
    return item[filter.name] 
  else
    return filter
}


async function execute(command, head, options = {}) {
  const startTime = performance.now()

  head.data = head.data.filter(item => filter_expr(command.filter,item, options))
  
  head.meta.push({ processor: 'filter', took: performance.now() - startTime })
}

module.exports = execute