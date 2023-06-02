const { parse } = require("../grammar");

async function check(query) {
  try {
    const path_regex = /""[^\/?"<>|]+""/g;
    let paths = query.match(path_regex);
    if (paths)
      for (const path of paths) {
        const new_path = path.replace(/""/g, "!@#").replace(/\\/g, "####");
        query = query.replace(path, new_path);
      }

    parse(query);
    return {
      error: false,
    };
  } catch (e) {
    return {
      error: true,
      message: e.message,
    };
  }
}

module.exports = check;
