

const { parse } = require('../grammar')

async function check(query) {
  try {
    const query_arr=query.split("=")
    if(query_arr[2]!==undefined)
{
    if(query_arr[2].includes("\\"))
    {
        query=query_arr[0]+"="+query_arr[1]+"="+(query_arr[2].replace(/\\/g,"####").replace(/"/g,""))
    
    }
}

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