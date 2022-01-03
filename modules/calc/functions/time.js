var moment = require('moment-timezone')


module.exports = {
  now : ()=>moment(),
  mkTime : moment,
  strTime : (time,format) => moment(time).format(format),
  strTimeZ : (time,format,tz) => moment(time).tz(tz).format(format),
  epoc_mill: (time) => moment(time).valueOf(),
  epoc : (time)=>moment(time).unix(),
  time_add : (time,count,unit)=> moment(time).add(count,unit),
  time_round: (time,roundTo) =>  moment(time).startOf(roundTo)
}