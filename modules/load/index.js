const { performance } = require('perf_hooks')

const fs = require('fs')

const { parseCSV } = require('../parse/parser')
const { default: Axios } = require('axios')

const readFile = (path) => new Promise((resolve, reject) => {
  fs.readFile(path, (err, data) => {
    if (err)
      resolve(err.message)
    else
      resolve(data.toString())
  })
})

async function readURL(url) {
  try {
    const { data } = await Axios.get(url)
    return data.toString()
  }
  catch {
    console.log('Axios Error')
  }
  return ''
}


async function getSource(source) {
  const { type, path } = source
  switch (type) {
    case 'url': return await readURL(path)
    default: return await readFile(path)
  }
}


async function setOutput(output, destination, head) {
  const { to, spec } = destination
  switch (to) {
    case 'search':
      if (spec === 'replace')
        head.data = output
      else
        head.data.push(...output)
      break;
    default: head.stack[spec] = output
  }
}

async function parseContent(content, file_type) {
  try {
    switch (file_type) {
      default: return await parseCSV(content)
    }
  }
  catch (err){
    console.log(err)
  }

  return content
}


async function execute(command, head, options = {}) {
  const startTime = performance.now()

  const { source, type, destination } = command
  const src = await getSource(source)

  await setOutput(await parseContent(src, type), destination, head)

  head.meta.push({ processor: 'load', took: performance.now() - startTime })
}

module.exports = execute