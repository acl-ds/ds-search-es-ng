const { Worker, SHARE_ENV } = require("worker_threads");

const suggest = require("./auto_complete");

const check = require("./auto_complete/check");

const queryAsync = (queryObject) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(__dirname + "/threading/query_thread.js", {
      workerData: queryObject,
      env: SHARE_ENV,
    });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });

module.exports = { queryAsync, suggest, check,status:true };
