const peg = require("pegjs")
const { readFileSync } = require('fs')
const path = require('path')


let parser = { parse: () => 'NOT_IMPLEMENTED' }

parser = peg.generate(readFileSync(path.join(__dirname, 'on_search.peg')).toString(), { allowedStartRules: ['statments']})

module.exports = parser