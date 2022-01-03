const resolveObject = (object, path, delimter = '.') => path.split(delimter).reduce((p, c) => p && p[c] || null, object)

function resolveObjectWrapper(object, path, delimter = '.') {

  const isNullOrUndefined = (value) => [undefined].includes(value)

  const value = object[path]
  if (!isNullOrUndefined(value))
    return value

  const resolvedValue = resolveObject(object, path, delimter)
  if (!isNullOrUndefined(resolvedValue))
    return resolvedValue

  // TODO Last condition, mixed path specifiers. Break and continue approch

  return null
}

function unflattenObject(data) {
  var result = {}
  for (var i in data) {
    var keys = i.split('.')
    keys.reduce(function (r, e, j) {
      return r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 == j ? data[i] : {}) : [])
    }, result)
  }
  return result
}

function flattenObject(ob, seperator = '.') {
  var toReturn = {};

  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;

    if ((typeof ob[i]) == 'object' && ob[i] !== null) {
      var flatObject = flattenObject(ob[i], seperator);
      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;

        toReturn[i + seperator + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}

module.exports = { unflattenObject, flattenObject, resolveObject: resolveObjectWrapper }