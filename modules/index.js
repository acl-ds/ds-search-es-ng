
const select = require('./select')
const calc = require('./calc')
const sort = require('./sort')
const first = require('./first')
const last = require('./last')
const filter = require('./filter')
const dedup = require('./dedup')
const stack = require('./stack')
const join = require('./join')
const aggregate = require('./aggregate')
const lookup = require('./lookup')
const load = require('./load')

const row = async function (command, head) {
  head.data = [{}]
  head.meta.push({ processor: 'single_row', took: 0 })
}

module.exports = { select, calc, sort, first, last, filter, dedup, stack, join, aggregate, lookup, row, load }