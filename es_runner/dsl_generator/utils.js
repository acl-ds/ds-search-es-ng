function prepareQueryFilter(query) {  
  const new_path_regex = /!@#\$[^\/:?"<>|]:####[^\/:?"<>|]+!@#\$/;
  path = query.match(new_path_regex);
  if (path && path[0]) {
    const new_path = path[0]
      .replace(/####/g, "\\\\")
      .replace(/:\\\\/g, "\\:\\\\")
      .replace(/ +/g, "*")
      .replace(/!@#\$/g, "");
    query = query.replace(path[0], new_path);
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
