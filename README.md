# tezos vanity address generator
This tool helps you brute force tezos vanity addresses that start or end with a user-defined search term.

## Set your search term
Your search term can be set either using an .env file or using environment variables:
* For environment variables, see an example in the "start" script in `package.json`.
* To use an `.env` file, copy `.env.example`, rename it to `.env` and fill in the search term.

## Run it
To run the script:
* If you've adjusted your search term in `package.json`, run it with `pnpm start`.
* If you're using the `.env` file or are otherwise setting the environment variable, run it with `node index.js`.

## TODO
I'd like to make this more efficient, or ideally use the GPU instead of the CPU.

If you have knowledge in how to do this, feel free to open an issue or submit a merge request!
