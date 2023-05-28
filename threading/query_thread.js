const { isMainThread, parentPort, workerData } = require("worker_threads");

// if (isMainThread)
//   process.exit()

const { query, timePicker, options } = {
  query:
    "search index=thanseer address.path=C:\\Users\\AnushaKP\\AppData\\Local\\Microsoft\\Teams\\current\\Teams.exe",
  timePicker: {
    filter: {
      gte: "2022-12-31T18:30:00.000Z",
      lte: "2023-05-28T10:36:46.367Z",
      format: "strict_date_optional_time",
    },
    timeField: "@timestamp",
  },
  options: {
    customerFilter: [
      { terms: { tenant: ["00000000-0000-0000-0000-000000000000"] } },
    ],
    indices: [],
  },
};

const { Client } = require("@elastic/elasticsearch");
const pgp = require("pg-promise");

const q_seq = require("../query_sequencer");

const {
  esNodeUrl = process.env.ES_STRING || "http://localhost:9200",
  dbURL = process.env.DB_QUERY ||
    "postgres://postgres:winwin@localhost:5432/postgres",
} = options;

const esClient = new Client({ node: esNodeUrl });
const dbClient = pgp({})(dbURL);

console.log("Inside query thread");
console.log("Query", query);
q_seq
  .executeQuery(query, timePicker, { ...options, esClient, dbClient })
  .then((r) => parentPort.postMessage(r))
  .finally(() => {
    dbClient.$pool.end();
    esClient.close();
  });
