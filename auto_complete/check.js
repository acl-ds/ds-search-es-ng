const { parse } = require("../grammar");

async function check(query) {
  try {
    // const path_regex = /""+((?!"").)+""/g;
    // let paths = query.match(path_regex);
    // if (paths)
    //   for (const path of paths) {
    //     const new_path = path.replace(/""/g, "!@#").replace(/\\/g, "####");
    //     query = query.replace(path, new_path);
    //   }
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
        if (new_path[i] !== rvrs_new_path[rvrs_new_path.length-i-1]) {
          path = `${new_path[i].slice(
            0,
            new_path[i].length / 2 + 1
          )}${rvrs_new_path[rvrs_new_path.length-i-1].slice(rvrs_new_path[rvrs_new_path.length-i-1].length / 2)}`;
        } else path = new_path[i];
        query = query.replace(
          path,
          path.replace(/"/g, "!@#").replace(/\\/g, "####")
        );
      }
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
