const { performance } = require("perf_hooks");

const { process } = require("../../es_runner");

// BEGIN polyfill_flatMap
if (!Array.prototype.flatMap) {
  Object.defineProperty(Array.prototype, "flatMap", {
    value: function (callback, thisArg) {
      var self = thisArg || this;
      if (self === null) {
        throw new TypeError(
          "Array.prototype.flatMap " + "called on null or undefined"
        );
      }
      if (typeof callback !== "function") {
        throw new TypeError(callback + " is not a function");
      }

      var list = [];

      // 1. Let O be ? ToObject(this value).
      var o = Object(self);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      for (var k = 0; k < len; ++k) {
        if (k in o) {
          var part_list = callback.call(self, o[k], k, o);
          list = list.concat(part_list);
        }
      }

      return list;
    },
  });
}
// END polyfill_flatMap

async function storeToElasticSearch(data, esClient) {
  const index = `.search_head_${Math.random()
    .toString(36)
    .substr(2, 8)
    .toLowerCase()}`;

  const body = data.flatMap((doc) => {
    const { _index, ...cleanedDoc } = doc;
    if (_index) {
      cleanedDoc.index = _index;
    }
    return [{ index: { _index: index } }, cleanedDoc];
  });

  const { body: bulkResponse } = await esClient.bulk({ refresh: true, body });
  if (bulkResponse.errors) return false;
  return index;
}

async function deleteIndex(index, esClient) {
  await esClient.indices.delete({ index });
}

async function execute(command, head, options = {}) {
  if (head.data.length > 0) {
    const startTime = performance.now();

    const { body: aggregationBody } = command;

    // Processing the request with ES
    const { esClient } = options;
    const tempIndex = await storeToElasticSearch(head.data, esClient);
    const searchBody = {
      query: "*",
      size: 0,
      searchMode: "default",
      bypassTimeFilter: true,
      index: tempIndex,
    };
    const { data } = await process(
      searchBody,
      aggregationBody,
      { field: "" },
      { esClient }
    );
    deleteIndex(tempIndex, esClient);

    // Storing back the data
    head.data = data;
    head.meta.push({
      processor: "aggregate",
      took: performance.now() - startTime,
    });
  }
}
module.exports = execute;
