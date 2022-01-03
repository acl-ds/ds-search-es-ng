

const { parse } = require('../grammar')

async function check(query) {
  try {
    parse(query)
    return {
      error: false
    }
  }
  catch (e) {
    return {
      error: true,
      message: e.message
    }
  }
}

module.exports = check