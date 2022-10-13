require("dotenv-safe").config();

const { Worker } = require("worker_threads");

const os = require("os");

const { Listr } = require("listr2");

const search = process.env.SEARCH;

console.log("Searching for '" + search + "'");
console.log("");

let rate = 0;

const start = Date.now();

console.time("vanity");

const workerData = {};

workerData.search = search;
workerData.data = new Int32Array(
  // 0 = attempts
  // 1 = ticks
  // 2 = done
  new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3)
);

let result;

const workerTasks = [];

// Time between updates in ms
const updateRate = 250;

os.cpus().forEach((cpu, idx) => {
  workerTasks.push({
    title: "Starting thread " + idx + "...",
    task: async (ctx, task) => {
      await new Promise((resolve, reject) => {
        let attempts = 0;

        const worker = new Worker("./worker.js", { workerData });

        const interval = setInterval(() => {
          task.title = "#" + idx + ": " + attempts + " hashes";
        }, updateRate);

        worker.on("message", (data) => {
          if ("result" in data) {
            clearInterval(interval);

            result = data.result;
            resolve(data.result);
          } else if ("done" in data) {
            clearInterval(interval);

            resolve();
          } else {
            attempts = data.attempts;
          }
        });
      });
    },
  });
});

workerTasks.push({
  title: "Total stats",
  task: async (ctx, task) => {
    await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const passed = Date.now() - start;

        const total = Atomics.load(workerData.data, 0);

        rate = (total / (passed / 1000)).toFixed(2);

        task.title = total.toLocaleString() + " hashes, " + rate + " hashes/s";

        if (result) {
          clearInterval(interval);

          setTimeout(() => {
            console.log("");
            console.timeEnd("vanity");
            console.log(result.sk + " " + result.pkh);
          }, 100);

          resolve(result);
        }
      }, updateRate);
    });
  },
});

const tasks = new Listr(workerTasks, { concurrent: true });

tasks.run();
