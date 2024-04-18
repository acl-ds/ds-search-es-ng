const parser = require("../grammar/");
// Prod starts here

const { performance } = require("perf_hooks");

const { process } = require("../es_runner");
const { prepareQueries } = require("../es_runner/stack_query");
const onSearchModules = require("../modules");
class SearchHead {
  constructor() {
    this.data = [];
    this.meta = [];
    this.stack = {};
  }
}

const indentity = async (statment, head) => {
  head.meta.push({ processor: "indentity", took: 0 });
};

async function processDataStoreSearch(
  head,
  search,
  aggregation,
  timePicker,
  options = {}
) {
  const result = await process(search, aggregation, timePicker, options, head);
  head.data.push(...result.data);
  head.meta.push({ processor: "data_store_search", ...result.meta });
}

async function processOnFunction(head, command, options) {
  const { statement } = command;

  if (statement && typeof onSearchModules[statement] === "function")
    await onSearchModules[statement](command, head, options);
  else indentity(command, head);
}

async function executeQuery(query, timePicker, options) {
  const parsedQuery = [];
  let parseTook = 0;
  try {    
    const path_regex = /"".*?""/g;
    const rvrs_query = query.split("").reverse().join("");
    const new_path = query.match(path_regex);
    let rvrs_new_path = rvrs_query.match(path_regex);
    if (new_path && rvrs_new_path) {
      rvrs_new_path = rvrs_new_path.map((item) => {
        return item.split("").reverse().join("");
      });
      for (i = 0; i < new_path.length; i++) {
        let path;
        if (new_path[i] !== rvrs_new_path[i]) {
          path = `${new_path[i].slice(
            0,
            new_path[i].length / 2 + 1
          )}${rvrs_new_path[i].slice(rvrs_new_path[i].length / 2)}`;
        } else path = new_path[i];
        query = query.replace(
          path,
          path.replace(/"/g, "!@#").replace(/\\/g, "####")
        );
      }
    }
    console.log(query);
    const parseStart = performance.now();
    const res = parser.parse(query);
    parsedQuery.push(...res);
    parseTook = performance.now() - parseStart;
  } catch (error) {
    console.log(error);
    return { status: false, reason: error };
  }

  let iterator = 0;
  const totalLength = parsedQuery.length;

  const head = new SearchHead();

  while (iterator < totalLength) {
    const currentItem = parsedQuery[iterator];
    // Identify and process searcg head
    if (currentItem.statement === "search") {
      let aggreagtion = undefined;
      const nextItem = parsedQuery[iterator + 1];
      if (nextItem && nextItem.statement === "aggregate") {
        aggreagtion = nextItem;
        iterator++;
      }

      const { searchMode, query: baseQuery } = currentItem.body;
      for (let query of prepareQueries(baseQuery, searchMode, head)) {
        await processDataStoreSearch(
          head,
          { ...currentItem.body, query },
          nextItem && nextItem.body,
          timePicker,
          options
        );
      }

      // Increment counter and continue
      iterator++;
      continue;
    }

    await processOnFunction(head, currentItem, options);
    // increment iterator
    iterator++;
  }
  const totalTimeTaken = head.meta.reduce((acc, cur) => acc + cur.took, 0);
  return { status: true, meta: { parseTook, totalTimeTaken }, head };
}

module.exports = { executeQuery };
