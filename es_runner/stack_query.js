
const Mustache = require('mustache')
Mustache.tags = ['{', '}']
Mustache.escape = i => i


function prepareIterativeQueryStrings(baseQuery, head) {
  const returnQueries = []
  const stackRefs = Mustache.parse(baseQuery).filter(i => i[0] === 'name').map(i => i[1].split('.')[0])
  stackRefs.forEach(stackRef => {
    const stack = head.stack[stackRef]
    if (!stack)
      return
    stack.forEach(stackItem => {
      returnQueries.push(Mustache.render(baseQuery, { [stackRef]: stackItem }))
    })
  })
  return returnQueries
}

function prepareORQueryStrings(baseQuery, head) {
  const preparedQueries = prepareIterativeQueryStrings(`(${baseQuery})`, head)
  if(!preparedQueries.length)
    return [baseQuery,]
  const returnQueries = preparedQueries.reduce((current,prev)=>(`${prev} OR ${current}`))
  return [returnQueries]
}

function prepareQueries(queryBase, searchMode, head) {
  if (searchMode === "default")
    return [queryBase,]
  if (searchMode === 'stack_itr')
    return prepareIterativeQueryStrings(queryBase, head)
  if (searchMode === 'stack_or')
    return prepareORQueryStrings(queryBase, head)
  return [queryBase,]
}

module.exports = { prepareQueries }