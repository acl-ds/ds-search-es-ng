function prepareQueryFilter(query) {
  const new_path_regex = /!@#[^\/?"<>|!@]+!@#/g;

  paths = query.match(new_path_regex);
  if(paths)
  for (const path of paths) {
    const new_path = path
      .replace(/####/g, "\\\\")
      .replace(/:\\\\/g, "\\:\\\\")
      .replace(/ +/g, "*")
      .replace(/!@#/g, "")
      .replace(/\(|\)/g, "*");
    query = query.replace(path, new_path)
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
