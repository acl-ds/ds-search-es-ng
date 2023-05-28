function prepareQueryFilter(query) {
  const query_arr = query.split("=");
  if(query_arr[1]!==undefined)
  {
    if (query_arr[1].includes("####"))
    query=`${query_arr[0]}="${query_arr[1]}"`.replace(/####/g, "\\\\") 
  }
    return query
      .replace(/index\s*=/g, "_index=")
      .replace(/\s*>\s*([^=])/g, ":>$1")
      .replace(/\s*<\s*([^=])/g, ":<$1")
      .replace(/\s*>=\s*/g, ":>=")
      .replace(/\s*<=\s*/g, ":<=")
      .replace(/\s*(\w+)\s*!=\s*/g, " NOT $1:")
      .replace(/([^><])=/g, "$1:");
}

module.exports = {
  prepareQueryFilter /* : (q)=>{
    const c = prepareQueryFilter(q)
    console.log(c)
    return c
  }  */,
};
