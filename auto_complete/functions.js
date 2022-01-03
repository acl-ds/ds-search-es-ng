

function evalFunctionSuggestions() {
  const functions = [
    { type: 'eval_function', name: '_raw()', desc: 'Raw input' },
    { type: 'eval_function', name: 'round()', desc: 'Round input' },
    { type: 'eval_function', name: 'md5()', desc: 'md5 of input' },
    { type: 'eval_function', name: 'replace()', desc: 'Replace input' },
    { type: 'eval_function', name: 'if()', desc: 'Check if input' },
    { type: 'eval_function', name: 'split()', desc: 'Split input' },
    { type: 'eval_function', name: 'sha256()', desc: 'sha256 of input' },
    { type: 'eval_function', name: 'sha512()', desc: 'sha512 of input' },
    { type: 'eval_function', name: 'upper()', desc: 'Uppercase of input' },
    { type: 'eval_function', name: 'lower()', desc: 'Lowercase of input' },
    { type: 'eval_function', name: 'b64encode()', desc: 'Base 64 encode of input' },
    { type: 'eval_function', name: 'b64decode()', desc: 'Base 64 decode of input' },
    { type: 'eval_function', name: 'coalesce()'},
    { type: 'eval_function', name: 'toString()', desc: 'String of input' },
    { type: 'eval_function', name: 'toNumber()', desc: 'Split input' },
    { type: 'eval_function', name: 'now()', desc: 'returns now' },
    { type: 'eval_function', name: 'mkTime()' },
    { type: 'eval_function', name: 'strTime()', desc: 'Stringify time' },
    { type: 'eval_function', name: 'strTimeZ()', desc: 'Stringify time with timezone' },
    { type: 'eval_function', name: 'epoc_mill()', desc: 'Epoc milli time of input' },
    { type: 'eval_function', name: 'time_add()', desc: 'Add time' },
    { type: 'eval_function', name: 'time_round()', desc: 'Round time' },
  ]

  return functions
}

function filterFunctionSuggestions() {
  const functions = [
    { type: 'fitler_function', name: 'true()', desc: 'returns true' },
    { type: 'fitler_function', name: 'false()', desc: 'returns false' },
    { type: 'fitler_function', name: 'contains()' },
    { type: 'fitler_function', name: 'isNull()' },
    { type: 'fitler_function', name: 'regex_match()' },
    { type: 'fitler_function', name: 'any_of()' },
    { type: 'fitler_function', name: 'isZero()' }
  ]

  return functions
}

function metricFunctionSuggestions() {
  const functions = [
    { type: 'metric_function', name: 'avg()', desc: 'calculate average' },
    { type: 'metric_function', name: 'count', desc: 'total number of entries' },
    { type: 'metric_function', name: 'max()', desc: 'calculate maximum' },
    { type: 'metric_function', name: 'min()', desc: 'calculate minimum' },
    { type: 'metric_function', name: 'min()', desc: 'calculate minimum' },
    { type: 'metric_function', name: 'sum()', desc: 'calculate sum' },
    { type: 'metric_function', name: 'median()', desc: 'calculate median' },
    { type: 'metric_function', name: 'der()', desc: 'calculate derivative' },
    { type: 'metric_function', name: 'stats()' },
    { type: 'metric_function', name: 'dc()' },
    { type: 'metric_function', name: 'e_stats()' },
    { type: 'metric_function', name: 'count_if()' },
    { type: 'metric_function', name: 'hits()' }
  ]

  return functions
}

function moduleNameSuggestions() {
  const functions = [
    { type: 'module', name: 'search '},
    { type: 'module', name: 'select '},
    { type: 'module', name: 'aggs '},
    { type: 'module', name: 'filter '},
    { type: 'module', name: 'calc '},
    { type: 'module', name: 'sort '},
    { type: 'module', name: 'dedup '},
    { type: 'module', name: 'first '},
    { type: 'module', name: 'last '},
    { type: 'module', name: 'stack '},
    { type: 'module', name: 'join '},
    { type: 'module', name: 'lookup '},
    { type: 'module', name: 'load '}
  ]

  return functions
}

function whiteSpaceSuggestions(expected) {
  const functions = []
  for (const expectation of expected) {
    const { type, text } = expectation
    if (type === 'literal' && text)
      functions.push({ type: 'whitespace', name: text})
  }
  return functions
}

module.exports = { 
  evalFunctionSuggestions, 
  filterFunctionSuggestions, 
  metricFunctionSuggestions,
  moduleNameSuggestions,
  whiteSpaceSuggestions
}