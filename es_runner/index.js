const { performance } = require("perf_hooks");

const { createDSL } = require("./dsl_generator");
const { tablify } = require("../utils/tablify");



function findAggsSize(size, bucketSizeHistory) {
  aggsSum = bucketSizeHistory.reduce((a, b) => a + b, 0);
  if (aggsSum >= size) return 0;
  if (size - aggsSum > 10000) return 10000;
  return size - aggsSum;
}


function convertEpochtoUTC(item, aggreagationBody, FIELDS) {
  const data = {};
  if (aggreagationBody && FIELDS.length > 0) {
    for (byTerm of aggreagationBody.by) {

      if (
        item.key[byTerm.name || byTerm.field] &&
        FIELDS.includes(byTerm.field) &&
        typeof item.key[byTerm.name || byTerm.field] === "number"
      ) {
        data[byTerm.name || byTerm.field] = new Date(
          item.key[byTerm.name || byTerm.field]
        ).toISOString();
      }
    }
  }
  return data;
}  

function populateCompostiteAggsData(aggsData, aggreagationBody, FIELDS) {
  const data = []
  for (item of aggsData) {
    const convertDate = convertEpochtoUTC(item, aggreagationBody, FIELDS);
    data.push({
      ...item.key,
      count: item.doc_count,
      ...convertDate,
    });
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
async function executeQuery(client, body, { indices }) {
  if (!client) return { status: false, message: "client not configured" };

  // body.script_fields = script

  let resultFromES = {};
  try {
    resultFromES = await client.search({
      index: indices,
      body,
      rest_total_hits_as_int: true,
    });

  } catch (err) {
    if (err.meta && err.meta.statusCode >= 400) {
      return {
        status: false,
        message: "invalid request to data store",
        errorBody: err.meta.body,
      };
    }
    return {
      status: false,
      message: "data store unavailable," + err.toString(),
    };
  }
  return {
    result: resultFromES.body,
    took: resultFromES.body.took,
    status: true,
    message: "data store query completed",
  };
}


async function driveExecuteQuery(
  client,
  body,
  { indices },
  size,
  isHistogram,
  bucketSizeHistory = []
) {
  let doNextSearch = true;
  let resultFromEQ = {
    result: undefined,
    took: 0,
  };
  if (body.aggs?.composite_agg)
    bucketSizeHistory.push(body.aggs.composite_agg.composite.size);
  lastExecTime = false;
  N = 1;
  while (doNextSearch) {
    if (lastExecTime) {
      const now = +new Date();
      const diff = now - lastExecTime;
      lastExecTime = now;
      // console.log("executed no " + N++, " timeTaken " + diff);
    } else {
      lastExecTime = +new Date();
      // console.log("executed no", N++);
    }
    const { result, took, status, errorBody, message } = await executeQuery(
      client,
      body,
      { indices }
    );
    if (status) {
      if (
        true &&
        isHistogram &&
        body.query.bool.filter[0] &&
        result.aggregations
      ) {
        const aggsField = Object.keys(result?.aggregations)[0];
        result.aggregations[aggsField].buckets = filterBuckets(
          result.aggregations[aggsField].buckets || [],
          body.query.bool.filter[0].range["@timestamp"].gte,
          body.query.bool.filter[0].range["@timestamp"].lte
        );
      }
      if (
        result.aggregations &&
        result.aggregations.composite_agg &&
        result.aggregations.composite_agg.after_key &&
        body.aggs.composite_agg.composite.size < size &&
        result.aggregations.composite_agg.buckets.length >=
        body.aggs.composite_agg.composite.size &&
        body.aggs.composite_agg.composite.size > 0
      ) {
        body.aggs.composite_agg.composite.after =
          result.aggregations.composite_agg.after_key;

        body.aggs.composite_agg.composite.size =
          bucketSizeHistory[
          bucketSizeHistory.push(findAggsSize(size, bucketSizeHistory)) - 1
          ];

        if (!resultFromEQ.result) {
          resultFromEQ.result = result;
        } else {
          resultFromEQ.result.aggregations.composite_agg.buckets =
            resultFromEQ.result.aggregations.composite_agg.buckets.concat(
              result.aggregations.composite_agg.buckets
            );
        }
        resultFromEQ.took += took;
        console.log("query took ", took);

        if (!body.aggs.composite_agg.composite.size > 0) {

          resultFromEQ.status = true;
          return resultFromEQ;
        }
      } else {
        if (body.aggs?.composite_agg) {
          if (resultFromEQ.result) {
            resultFromEQ.status = true;
            return resultFromEQ;
          }
          return { result, took, status };
        } else {
          return { result, took, status };
        }
      }
    } else {
      return { status };
    }
  }
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

function processAggregatedResults(aggregations = {}) {
  const root = {};

  Object.entries(aggregations).forEach(([name, valueObject]) => {
    root[name] = prepareValueObject(valueObject, name);
  });

  return [root];
}

 function cacheFieldDataType(indices, mappedIndices, field, type) {
    if (mappedIndices) {
      indices = mappedIndices
    }
    for (const index of indices) {
      FieldDataType.set(`${index}##${field}`, type)
    }
  }

 async function populateDataTypeOfFields(esClient,
    aggreagationBody,
    isHistogram,
    index) {
    let FIELDS = {
      DateFields: [],
      NumberField: []
    };
    if ((aggreagationBody?.metric === "count" || aggreagationBody?.metric?.metric_functions) && !isHistogram) {
      const fieldsToFetch = []
      for (byTerm of aggreagationBody?.by || []) {
        if (!preDefinedDateFields.includes(byTerm.field)) {
          const FieldValue = FieldDataType.get(`${index}##${byTerm.field}`)
          if (FieldValue) {
            if (FieldValue === 'DATE') {
              FIELDS.DateFields.push(byTerm.field)
            } else if (["long", "float", "double"].includes(FieldValue)) {
              FIELDS.NumberField.push(byTerm.field)
            }
          }
          else {
            fieldsToFetch.push(byTerm.field)
          }
        }
        else {
          FIELDS.DateFields.push(byTerm.field)
        }
      }

      if (fieldsToFetch.length >= 1) {
        try {
          const { body } = await esClient.fieldCaps({
            index,
            fields: fieldsToFetch,
            include_unmapped: true,
          });
          for (const field of fieldsToFetch) {
            if (body.fields[field]) {
              if (
                body.fields[field]?.['long'] ||
                body.fields[field]?.['float'] ||
                body.fields[field]?.['double']
              ) {
                cacheFieldDataType(body.indices,
                  (body.fields[field]?.['long']?.indices || []).concat(
                    body.fields[field]?.['float']?.indices || []
                  ).concat(
                    body.fields[field]?.['double']?.indices || []
                  ),
                  field, 'NUMBER')
                FIELDS.NumberField.push(field)
              }
              if (body.fields[field]?.['date']) {
                cacheFieldDataType(body.indices, body.fields[field]?.['date']?.indices, field, 'DATE')
                FIELDS.DateFields.push(field)
              }
              else {
                delete body.fields[field].unmapped
                for (const filedType in body.fields[field]) {
                  cacheFieldDataType(body.indices, body.fields[field]?.[filedType]?.indices, field, 'N')
                }
              }
            }
          }
        } catch (err) {
          console.log(err);
        }
      }
    }
    return FIELDS;
  }

  
async function process(searchBody, aggreagationBody, timePicker, options) {
  const parseStartTime = performance.now();
  const { esClient, shouldTablify = true } = options;
  let isHistogram = false;
  if (aggreagationBody) {
    const { by = [] } = aggreagationBody;
    if (by) {
      by.forEach((byTerm) => {
        if (byTerm.mode === "time_series" || byTerm.mode === "histogram") {
          isHistogram = true;
        }
      });
    }
  }
  const FIELDS = await populateDataTypeOfFields(
    esClient,
    aggreagationBody,
    isHistogram,
    searchBody.index
  );
  const { size, DSL } = createDSL(
    searchBody,
    aggreagationBody,
    timePicker,
    options,
    isHistogram,
    FIELDS.NumberField
  );
  const DSLCreationTook = performance.now() - parseStartTime;
  const { result, took, status, errorBody } = await driveExecuteQuery(
    esClient,
    DSL,
    options,
    size,
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
          data = populateCompostiteAggsData(
            result.aggregations.composite_agg.buckets,
            aggreagationBody,
            FIELDS.DateFields
          )
        else if (shouldTablify && result.aggregations)
          data.push(...tablify(processAggregatedResults(result.aggregations)));
        else if (result.aggregations) data.push(processAggregatedResults(result.aggregations));
        else
          console.log(new Date(), "aggregation failuures", result._shards.failures);
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
