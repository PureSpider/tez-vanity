const { workerData, parentPort } = require("worker_threads");

const { randomBytes } = require("crypto");

const sotez = require("sotez");
const cryptoUtils = sotez.cryptoUtils;

let attempts = 0;
let result;

let pkh = "";

const main = async () => {
  let found = false;

  while (!Atomics.load(workerData.data, 2)) {
    const ret = Atomics.wait(workerData.data, 1, 1); // 1 = pause

    if (ret == "not-equal") {
      Atomics.add(workerData.data, 0, 1); // total attempts
      attempts++;
  
      const privateKey = randomBytes(64);
      result = await cryptoUtils.extractKeys(sotez.b58cencode(privateKey, sotez.constants.prefix["edsk"]));
  
      pkh = result.pkh;
  
      parentPort.postMessage({ attempts });
  
      if (
        pkh.startsWith("tz1" + workerData.search) ||
        pkh.endsWith(workerData.search)
      ) {
        Atomics.store(workerData.data, 2, 1); // done
  
        found = true;
        parentPort.postMessage({ result });
      }
    }
  }

  if (!found) {
    parentPort.postMessage({ done: true });
  }
};

main();
