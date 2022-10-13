const { workerData, parentPort } = require("worker_threads");

const sotez = require("sotez");
const cryptoUtils = sotez.cryptoUtils;

let attempts = 0;
let result;

let pkh = "";

const main = async () => {
  let found = false;

  while (!Atomics.load(workerData.data, 2)) {
    Atomics.add(workerData.data, 0, 1); // total attempts
    attempts++;

    const mnemonic = cryptoUtils.generateMnemonic();
    result = await cryptoUtils.generateKeys(mnemonic);

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

  if (!found) {
    parentPort.postMessage({ done: true });
  }
};

main();
