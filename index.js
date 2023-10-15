// const { Worker, SHARE_ENV } = require("worker_threads");

const suggest = require("./auto_complete");

const check = require("./auto_complete/check");

const { Client } = require("@elastic/elasticsearch");

const pgp = require("pg-promise");

const q_seq = require("./query_sequencer/index");

const esClient = new Client({
  node: (esNodeUrl = process.env.ES_STRING2 || "http://localhost:9202"),
});

const queryAsync = (queryObject, dbClient) =>
  new Promise((resolve, reject) => {
    const { query, timePicker, options } = queryObject;
    q_seq
      .executeQuery(query, timePicker, { ...options, esClient, dbClient })
      .then((r) => {
        resolve(r);
      })
      .catch((err) => {
        reject(err);
      });
  });

module.exports = { queryAsync, suggest, check };
