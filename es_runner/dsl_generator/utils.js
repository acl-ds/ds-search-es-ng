function prepareQueryFilter(query) {
  return query
          .replace(/index\s*=/g, '_index=')
           .replace(/\s*>\s*([^=])/g,':>$1')
           .replace(/\s*<\s*([^=])/g,':<$1')
           .replace(/\s*>=\s*/g,':>=')
           .replace(/\s*<=\s*/g,':<=')
           .replace(/\s*(\w+)\s*!=\s*/g,' NOT $1:')
           .replace(/([^><])=/g,'$1:')
           .replace(/\\/g, "\\\\");

}
module.exports = {
  prepareQueryFilter /* : (q)=>{
    const c = prepareQueryFilter(q)
    console.log(c)
    return c
  }  */
}