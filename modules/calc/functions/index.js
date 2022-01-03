
const { createHash } = require('crypto')


const timeFunctions = require('./time')

function hash(i, hash = 'md5') {
  const hasher = createHash(hash)
  hasher.update(i)
  return hasher.digest('hex')
}

function coalesce(...args) {
  for (arg of args) {
    if (arg)
      return arg
  }
}

function switch_case (exp,...cases){

  `switch (exp) {
    case value:
      
      break;
  
    default:
      return 0
  }`

  return 0
}

module.exports = {
  _raw: (i) => i,
  round: (i) => isNaN(i) ? 0 : Math.round(i),
  md5: (i) => hash(i, 'md5'),
  sha256: (i) => hash(i, 'sha256'),
  sha512: (i) => hash(i, 'sha512'),
  split: (i, delim, take) => take !== undefined ? i.split(delim)[take] || '' : i.split(delim),
  replace: (i, pattern, sub) => i.replace(pattern, sub) || i,
  upper: (i) => typeof i === 'string' ? i.toUpperCase() : i,
  lower: (i) => typeof i === 'string' ? i.toLowerCase() : i,
  b64encode: (i) => typeof i === 'string' ? Buffer.from(i).toString('base64') : i,
  b64decode: (i) => typeof i === 'string' ? Buffer.from(i, 'base64').toString('utf-8') : i,
  coalesce,
  toString: (i) => `${i}`,
  toNumber: (i, base = 10) => parseInt(i, base),
  if: (exp,t,f)=> exp ? t : f,
  case: switch_case,

  ...timeFunctions
}