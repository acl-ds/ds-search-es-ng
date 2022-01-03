const csvParse = require('csv-parse')

async function parseCSV(input, options) {

  return new Promise((resolve, reject) => {
    csvParse(input, { columns: true, comment: '#',quote: '"', ltrim: true, delimiter:',' ,relaxColumnCountLess:true }, (err, result) => {
      if (err)
        reject(err)
      else
        resolve(result)
    })
  })
}



module.exports = { parseCSV }