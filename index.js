require("dotenv-safe").config();

var keypress = require("keypress");
keypress(process.stdin);

const { Worker } = require("worker_threads");

const os = require("os");

const { Listr } = require("listr2");

const alphabet = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

const search = process.env.SEARCH;

const start = Date.now();

console.log("Searching for '" + search + "'");
console.log("Started at " + new Date(start).toString());
console.log("");

let currentSearch = search;

while (currentSearch) {
    var alphabetPosition = alphabet.indexOf(currentSearch[0]);

    if (alphabetPosition < 0) {
        console.error("Can't find \"" + currentSearch[0] + '" in the alphabet: "' + alphabet + '"');
        process.exit(1);
    }

    currentSearch = currentSearch.substring(1);
}

let rate = 0;

console.time("vanity");

const workerData = {};

workerData.search = search;
workerData.data = new Int32Array(
    // 0 = attempts
    // 1 = paused flag
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
                    task.title = "#" + idx + ": " + attempts.toLocaleString() + " hashes";
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

                rate = (total / (passed / 1000)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });

                task.title = total.toLocaleString() + " hashes, " + rate + " hashes/s - press P to pause";

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

process.stdin.on("keypress", function (ch, key) {
    if (key && key.ctrl && key.name == "c") {
        process.exit();
    }

    if (key && key.name == "p") {
        // toggle pause state
        const old = Atomics.xor(workerData.data, 1, 1);

        // if old value was "paused",
        // then new value is "not paused"
        // -> wake up worker threads
        if (old == 1) {
            Atomics.notify(workerData.data, 1);
        }
    }
});

process.stdin.setRawMode(true);
process.stdin.resume();

tasks.run();
