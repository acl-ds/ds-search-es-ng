
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

function processARow(root, data, template) {
  const { count: c } = template
  const { _hits, key, count = c, interval, ...rest } = root

  const multiValueSets = Object.entries(rest).filter(([, v]) => Array.isArray(v))
  const singleValueFields = Object.entries(rest).filter(([, v]) => !Array.isArray(v)).reduce(((prev, [k, v]) => ({ ...prev, [k]: v })), {})
  if (multiValueSets.length) {
    multiValueSets.forEach((multiValueSet,) => {
      let [name, values] = multiValueSet

      const isBinning = name.indexOf('___bin') > -1
      if (isBinning)
        name = name.split('___bin')[0]

      values.forEach((value, index) => {

        if (typeof value.key === 'number' && isBinning) {
          nextValue = values[index + 1]
          if (nextValue)
            value.key = `${value.key} - ${nextValue.key - 1}`
          else
            value.key = `${value.key}`
        }

        // const t = { ...template, [name]: value.key, ...singleValueFields, interval, count: value.count }
        const t = { [name]: value.key, ...singleValueFields, interval,...template, count: value.count}
        processARow(value, data, t)
      });
    })
    return
  }

  // Process hits section seperate  
  if (_hits && Array.isArray(_hits)) {
    _hits.forEach(hit => processARow(flattenObject(hit, '_'), data, { ...template, ...singleValueFields }))
    return
  }

  // export and flatten stats data
  const statsFields = Object.keys(singleValueFields).filter(i => i.indexOf('_stats_') != -1)
  statsFields.forEach(stats => {
    const fieldName = stats.split('_stats_')[1].replace(/\./g, '_')
    Object.entries(root[stats]).forEach(([key, value]) => {
      if (typeof value === 'object') {
        const tempObject = { [`${fieldName}_${key}`]: value }
        Object.entries(flattenObject(tempObject, '_')).forEach(entry => singleValueFields[entry[0]] = entry[1])
      } else {
        singleValueFields[`${fieldName}_${key}`] = value
      }
    })
    delete (singleValueFields[stats])
  })

  //Temp logic for median
  Object.entries(root).forEach(([key, value]) => {
    if (value && value.values) {
      singleValueFields[key] = value.values['50.0']
    }
  })
  // The general fallback
  data.push({ ...template, ...singleValueFields, count, interval })
}

function tablify(data) {
  const root = data[0]
  const retData = []
  processARow(root, retData, {})
  return retData
}

module.exports = { tablify, flattenObject }