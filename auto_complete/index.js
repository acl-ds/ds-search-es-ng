
const _ = require('lodash')

const { parse } = require('../grammar')

const { identifyFieldNames } = require('./field_names')
const { 
  evalFunctionSuggestions, 
  filterFunctionSuggestions, 
  metricFunctionSuggestions,
  moduleNameSuggestions,
  whiteSpaceSuggestions
} = require('./functions')

function lastParsedResult(query) {
  while (true) {
    try {
      return parse(query)
    } catch {
      const indexOfPipe = query.lastIndexOf('|')
      if (indexOfPipe < 1)
        return false
      query = query.substring(0, indexOfPipe)
    }
  }
}

async function getIndices({ esClient }) {
  const f = []
  try {
    const { statusCode, body } = await esClient.cat.indices({ format: 'json' })
    if (statusCode === 200) {
      body.forEach(index => {
        if (index.index[0] !== '.')
          f.push({ name: index.index, type: 'index' })
      });
    }
  } catch { }
  return f
}

async function suggestAutoCompletion(expected, parsedQuery, options) {
  const others = []
  const fields = []

  for (const expectation of expected.componets) {
    const { description = '', type, text } = expectation
    if (description.indexOf('_field_name') > -1) {
      fields.push(...await identifyFieldNames(parsedQuery, 'all', options))
    }
    else if (description === 'index_name') {
      others.push(...await getIndices(options))
    }
    else if (description === 'by_function') {
      others.push(...[{
        type: 'by_function',
        name: 'timeseries '
      }, {
        type: 'by_function',
        name: 'bins '
      }])
    }
    else if (description === 'eval_function_name') {
      others.push(...evalFunctionSuggestions())
    }
    else if (description === 'filter_function_name') {
      others.push(...filterFunctionSuggestions())
    }
    else if (description === 'singe_value_function') {
      others.push(...metricFunctionSuggestions())
    }
    else if (description === 'module_name') {
      others.push(...moduleNameSuggestions())
    }
    else if (description === 'whitespace') {
      others.push(...whiteSpaceSuggestions(expected.componets))
    }
  }

  return { fields, others }
}


async function suggest(query, options) {
  try {
    const parsedResult = parse(query)
    // Praser went without error
    const lastItem = parsedResult.pop()
    if (lastItem.statement === 'search') {
      const err = new SyntaxError()
      err.expected = [
        {
          "type": "other",
          "description": "gen_field_name"
        },
      ]
      throw err
    }
    return { validParsedResult: parsedResult }
  }
  catch (err) {
    if (err.name === 'SyntaxError') {
      const validParsedResult = lastParsedResult(query)
      const expected = { componets: _.uniqBy(err.expected, i => `${i.description}${i.text}`), location: err.location, found: err.found }
      return { validParsedResult, suggested: await suggestAutoCompletion(expected, validParsedResult, options) }
    }
  }
}

module.exports = suggest 