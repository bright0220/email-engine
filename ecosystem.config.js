module.exports = {
  apps : [{
    name: "headless",
    script: "./build/src/headless/index.js",
    node_args : "-r dotenv/config",
    interpreter : "node@16.19.0",
  }]
}