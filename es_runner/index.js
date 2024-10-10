const { performance } = require("perf_hooks");

const { createDSL } = require("./dsl_generator");
const { tablify } = require("../utils/tablify");



function findAggsSize(size,bucketSizeHistory) {
  aggsSum = bucketSizeHistory.reduce((a, b) => a + b, 0);
  if (aggsSum >= size) return 0;
  if (size - aggsSum > 10000) return 10000;
  return size - aggsSum;
}

function fetchDateTypeFields(mapping, prefix)
{
  const DateFields = [];
  for (const i in mapping) {
    if (mapping[i].properties) {
      const subDATA = fetchDateTypeFields(mapping[i].properties, `${prefix ? `${prefix}.${i}` : i}`);
      DateFields.push(subDATA);
    } else {
      if(mapping[i].type==='date')
      DateFields.push(`${prefix ? `${prefix}.${i}` : i}`);    
    }
  }
  return DateFields
}

 function convertEpochtoUTC(item,aggreagationBody,FIELDS)
{
  const data = {};
  if (aggreagationBody && FIELDS.length>0) {
    for (byTerm of aggreagationBody.by) {
      if (
        item.key[byTerm.name || byTerm.field] &&
        FIELDS.includes(byTerm.field) &&
        typeof item.key[byTerm.name || byTerm.field] === "number"
      ) {
        data[byTerm.name || byTerm.field] = new Date(item.key[byTerm.name || byTerm.field]).toISOString();
      }
    }
  }
  return data;
}

 function populateCompostiteAggsData(aggsData,aggreagationBody,FIELDS) {
  const data=[]
  for (item of aggsData) {
    const convertDate = convertEpochtoUTC(
      item,
      aggreagationBody,
      FIELDS
    );
    data.push({
      ...item.key,
      count: item.doc_count,
      ...convertDate,
    })
  }
  return data
}

function filterBuckets(buckets, gte, lte) {
  const startTime = new Date(gte).getTime();
  const endTime = new Date(lte).getTime();
  return buckets.filter((bucket) => {    
    return bucket.key >= startTime && bucket.key <= endTime;
  });
}

async function executeQuery(fresh, client, body, { indices }, size, aggreagationBody,FIELDS,isHistogram,bucketSizeHistory=[]) {
  if (!client) return { status: false, message: "client not configured" };

  let resultFromES = {};
  try {
    resultFromES = await client.search({
      index: indices,
      body,
      rest_total_hits_as_int: true,
    });
  } catch (err) {
    if (err.meta && err.meta.statusCode >= 400) {
      console.log("ES Error: ", JSON.stringify(err));
      return {
        status: false,
        message: "invalid request to data store",
        errorBody: err.meta.body,
      };
    }
    console.log("ES Error: ", err.toString());
    return {
      status: false,
      message: "data store unavailable," + err.toString(),
    };
  }
  if (isHistogram &&  body.query.bool.filter[0] && resultFromES.body.aggregations) {
      const aggsField=Object.keys(resultFromES.body?.aggregations)[0]
      resultFromES.body.aggregations[aggsField].buckets  = filterBuckets(
      resultFromES.body.aggregations[aggsField].buckets || [],
      body.query.bool.filter[0].range["@timestamp"].gte,
      body.query.bool.filter[0].range["@timestamp"].lte
    );
  }
  if (
    resultFromES.body.aggregations &&
    resultFromES.body.aggregations.composite_agg &&
    resultFromES.body.aggregations.composite_agg.after_key
  ) {
    if (body.aggs.composite_agg.composite.size < size) {
      if (fresh) bucketSizeHistory.push(body.aggs.composite_agg.composite.size);
      body.aggs.composite_agg.composite.after =
        resultFromES.body.aggregations.composite_agg.after_key;
  
      body.aggs.composite_agg.composite.size =
      bucketSizeHistory[bucketSizeHistory.push(findAggsSize(size,bucketSizeHistory)) - 1];
  
      if (body.aggs.composite_agg.composite.size > 0) {
        const { result, took, status } = await executeQuery(
          false,
          client,
          body,
          { indices },
          size,
          aggreagationBody,
          FIELDS,
          isHistogram,
          bucketSizeHistory
        );
        if (status === true) {
          resultFromES.body.took += took;
          resultFromES.body.aggregations.composite_agg.buckets =
           populateCompostiteAggsData(
            resultFromES.body.aggregations.composite_agg.buckets.concat(
              result.aggregations.composite_agg.buckets
            ),aggreagationBody,FIELDS)
        }
      }
    }
    else{
      resultFromES.body.aggregations.composite_agg.buckets =
       populateCompostiteAggsData(
        resultFromES.body.aggregations.composite_agg.buckets,aggreagationBody,FIELDS
      );
    }
  
  }

  return {
    result: resultFromES.body,
    took: resultFromES.body.took,
    status: true,
    message: "data store query completed",
  };
}

function processSearchResults(hits = []) {
  return hits.map(({ _index: index, _id, _source, _scroll }) => ({
    index,
    _id,
    ..._source,
    _scroll,
  }));
}

//Aggs functions

function prepareValueObject(valueObjectRef, name) {
  if (valueObjectRef.buckets !== undefined) {
    // this is a bucket aggregation
    const data = [];
    valueObjectRef.buckets.forEach(
      ({ key, key_as_string, doc_count, ...aggregations }) => {
        const { interval } = valueObjectRef;
        const dataToPush = {
          key: key_as_string || key,
          count: doc_count,
          interval,
        };
        Object.entries(aggregations).forEach(([name, valueObject]) => {
          dataToPush[name] = prepareValueObject(valueObject, name);
        });
        data.push(dataToPush);
      }
    );
    return data;
  }

  if (valueObjectRef.doc_count !== undefined) return valueObjectRef.doc_count;
  if (
    valueObjectRef.value !== undefined &&
    !Array.isArray(valueObjectRef.value)
  )
    return valueObjectRef.value;

  if (name === "_hits") {
    return valueObjectRef.hits.hits.map(({ _source, _id: id }) => ({
      ..._source,
      id,
    }));
  }
  return valueObjectRef;
}

function processAggregatedResults(aggregations) {
  const root = {};

  Object.entries(aggregations).forEach(([name, valueObject]) => {
    root[name] = prepareValueObject(valueObject, name);
  });

  return [root];
}
function fetchDateTypeFields(mapping, prefix) {
  const DateFields = [];
  for (const i in mapping) {
    if (mapping[i].properties) {
      const subDATA = fetchDateTypeFields(
        mapping[i].properties,
        `${prefix ? `${prefix}.${i}` : i}`
      );
      DateFields.push(subDATA);
    } else {
      if (mapping[i].type === "date")
        DateFields.push(`${prefix ? `${prefix}.${i}` : i}`);
    }
  }
  return DateFields;
}
async function populateDateFields(
  esClient,
  aggreagationBody,
  isHistogram,
  index
) {
  const preDefinedDateFields = ["@timestamp", "timestamp"];
  let FIELDS=[]
  if (aggreagationBody?.metric === "count" && !isHistogram) {
    let OtherDateFields = false;
    for (byTerm of aggreagationBody?.by || []) {
      if (!preDefinedDateFields.includes(byTerm.field)) {
        OtherDateFields = true;
      }
    }
    if (OtherDateFields) {
      const { body } = await esClient.indices.getMapping({ index });
      for (let index in body) {
        if (!index.startsWith(".")) {
          let Fields = fetchDateTypeFields(body[index]?.mappings?.properties);
          FIELDS.push(Fields)
        }
      }
      return FIELDS.flat(Infinity)
    }
    else 
    return preDefinedDateFields
  }
  return FIELDS;
}
async function process(searchBody, aggreagationBody, timePicker, options) {
  const parseStartTime = performance.now();
  const { size, DSL, isHistogram } = createDSL(
    searchBody,
    aggreagationBody,
    timePicker,
    options
  );
  const DSLCreationTook = performance.now() - parseStartTime;
  const { esClient, shouldTablify = true } = options;
  const FIELDS = await populateDateFields(
    esClient,
    aggreagationBody,
    isHistogram,
    searchBody.index
  );
  const { result, took, status, errorBody } = await executeQuery(
    true,
    esClient,
    DSL,
    options,
    size,
    aggreagationBody,
    FIELDS,
    isHistogram
  );
  const processingStartTime = performance.now();
  let data = [];
  if (status === true) {
    if (!aggreagationBody) data.push(...processSearchResults(result.hits.hits));
    else {
      if (aggreagationBody.metric === "count" && !aggreagationBody.by) {
        data.push(result.hits);
      } else {
        if (result.aggregations?.composite_agg)
          data = result.aggregations.composite_agg.buckets;
        else if (shouldTablify)
          data.push(...tablify(processAggregatedResults(result.aggregations)));
        else data.push(processAggregatedResults(result.aggregations));
      }
    }
  }

  const postProcessingTook = performance.now() - processingStartTime;
  return {
    data,
    meta: {
      DSLCreationTook,
      DataStoreSearchTook: took,
      totalEvents: status ? result.hits.total : 0,
      postProcessingTook,
      took: DSLCreationTook + took + postProcessingTook,
      sort:
        status &&
        result.hits.hits.length > 0 &&
        result.hits.hits[result.hits.hits.length - 1].sort,
    },
  };
}

module.exports = { process };
