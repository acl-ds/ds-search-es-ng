const { performance } = require('perf_hooks')
const functions = require('./functions')

function executeExprFunction(expr, item, options) {
  const left = evaluateExpression(expr.left, item, options)
  const right = evaluateExpression(expr.right, item, options)
  const { operator } = expr

  return eval(`left ${operator} right`)
}

function executeEvalFunction(expr, item, options) {
  const { fun, args } = expr
  let resolvedArgs = []
  if (args)
    resolvedArgs = args.map(arg => evaluateExpression(arg, item, options))
  if (typeof functions[fun] === 'function')
    return functions[fun](...resolvedArgs)
  return 0
}

function evaluateExpression(expr, item, options) {
  const { type } = expr
  if (type === 'eval_function')
    return executeEvalFunction(expr, item, options)
  else if (type === 'binary_expression')
    return executeExprFunction(expr, item, options)
  else if (type === 'literal')
    return expr.value
  else if (type === 'field_name')
    return item[expr.name] || null
  else
    return expr
}

function mapper(item, command, options) {
  const buffer = {}
  const { evals = [] } = command
  for ( {out, exp} of evals){
    buffer[out] = evaluateExpression(exp, { ...item, ...buffer }, options)
  }

  return { ...item, ...buffer }
}

async function execute(command, head, options) {
  const startTime = performance.now()

  head.data = head.data.map(item => mapper(item, command, options))

  head.meta.push({ processor: 'calc', took: performance.now() - startTime })
}

module.exports = execute