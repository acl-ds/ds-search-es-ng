// const { Worker, SHARE_ENV } = require("worker_threads");

const suggest = require("./auto_complete");

const check = require("./auto_complete/check");

const { Client } = require("@elastic/elasticsearch");

const pgp = require("pg-promise");

const q_seq = require("./query_sequencer/index");

const dbClient = pgp({})(
  process.env.DB_QUERY || "postgres://postgres:winwin@localhost:5432/postgres"
);

// const esClient = new Client({
//   node: (esNodeUrl = process.env.ES_STRING2 || "http://localhost:9202"),
// });
const esClient = new Client({
  node: (esNodeUrl = process.env.ES_STRING2 || "http://localhost:9202"),
});
require('events').defaultMaxListeners=500
const queryAsync = (queryObject, dbClient) =>
  new Promise((resolve, reject) => {
    
    // const worker = new Worker(__dirname + "/threading/query_thread.js", {
    //   workerData: queryObject,
    //   env: SHARE_ENV,
    // });
    // worker.on("message", resolve);
    // worker.on("error", reject);
    // worker.on("exit", (code) => {
    //   if (code !== 0)
    //     reject(new Error(`Worker stopped with exit code ${code}`));
    // });
    const { query, timePicker, options } = queryObject;

    // const {
    //   esNodeUrl = process.env.ES_STRING2 || "http://localhost:9202",
    //   dbURL = process.env.DB_QUERY ||
    //     "postgres://postgres:winwin@localhost:5432/postgres",
    // } = options;
    q_seq
      .executeQuery(query, timePicker, { ...options, esClient, dbClient })
      .then((r) => {
        // parentPort.postMessage(r);
        resolve(r);
      })
      .catch((err) => {
        reject(err);
      })
      .finally(() => {
        // dbClient.$pool.end();
        // esClient.close();
      });
  });

module.exports = { queryAsync, suggest, check };
count=1
limit=100;
console.time("test")
for (i = 1; i <= limit; i++) {
  queryAsync(
    {
      query:
        "search index=windows_logs eventId=4688 windows.Event.EventData.NewProcessName=*WMIC.exe AND windows.Event.EventData.CommandLine=(*CREATE* OR *create*) AND windows.Event.EventData.CommandLine=(*ActiveScriptEventConsumer* OR *CommandLineEventConsumer*)  | aggs count by host.name, user.name, windows.Event.EventData.TargetUserName, windows.Event.EventData.NewProcessName, windows.Event.EventData.CommandLine, windows.Event.EventData.ParentProcessName, @timestamp",
      timePicker: {
        timeField: "@timestamp",
        filter: {
          lte: "2023-10-12T17:40:00.000Z",
          gte: "2023-10-12T17:30:00.000Z",
        },
      },
      options: {
        customerFilter: {
          term: { tenant: "00000000-0000-0000-0000-000000000000" },
        },
      },
    },
    dbClient
  ).then((d)=>{
    console.log(d.status,count);
    count++
    if(count==limit)
    console.timeEnd("test")
  })
}


const numeral = require("numeral");
setInterval(() => {
  const { rss, heapTotal, external, heapUsed } = process.memoryUsage();
  log(`consuming   ${numeral(rss).format("0.0 ib")}\n\n`);
  // log(`available   ${numeral(heapTotal).format("0.0 ib")}`);
  // log(`buffers     ${numeral(external).format("0.0 ib")}`);
  // log(`occupied    ${numeral(heapUsed).format("0.0 ib")}\n\n`);
}, 500);

const { appendFile } = require("fs");

function log(message, logObject) {
  const logFile = `${__dirname}/collector.log`;
  if (typeof message !== "string") message = message.toString();

  if (!logObject) {
    appendFile(
      logFile,
      new Date().toISOString() + " :: " + message + "\n",
      (err) => err && console.error(err)
    );
  }
}