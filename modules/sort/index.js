const { performance } = require('perf_hooks')

function numberSorter(field,order) {
  if(order ==='asc')
    return (a,b)=> a[field]-b[field]
  return (a,b) =>  b[field]-a[field]
}

function stringSorter(field,order) {
  if(order ==='asc')
    return (a,b)=> a[field].localeCompare(b[field])
  return (a,b) =>  b[field].localeCompare(a[field])
}

function getSorter(sample,{field,order}){
  if(sample == null)
    return (r)=>r
  const sampleValue = sample[field]
  if(typeof sampleValue === 'number'){
    return numberSorter(field,order)
  }
  return stringSorter(field,order)
}

async function execute(command, head, options = {}) {
  const startTime = performance.now()
  try{
    const { fields = [] } = command
    fields.forEach(field => {
      head.data.sort(getSorter(head.data[0],field))
    });
  }catch {
    
  }

  head.meta.push({ processor: 'sort',took: performance.now() - startTime })
}

module.exports = execute