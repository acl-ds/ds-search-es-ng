const suggest = require("./auto_complete");

const check = require("./auto_complete/check");

const { Client } = require("@elastic/elasticsearch");

const pgp = require("pg-promise");

const q_seq = require("./query_sequencer/index");

const queryAsync = (queryObject, dbClient,esClient) =>
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
