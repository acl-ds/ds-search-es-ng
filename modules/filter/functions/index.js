module.exports = {
  true: () => true,
  false: () => false,
  contains: (text, seq) => text.indexOf(seq) > -1,
  regex_match: (text,regex='')=> new RegExp(regex).test(text),
  isNull : (i) => [undefined,null,''].includes(i),
  isZero : (i) => i == 0,
  any_of : (i,...match_list) =>  match_list.includes(i)
}