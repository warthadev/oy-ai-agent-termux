#!/usr/bin/env node

const readline = require("readline");
const { runAI } = require("./ai-core");
const { getConfig, saveConfig, models } = require("./config-history");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "OY > "
});

let waitingModel = false;
let isBusy = false;

async function start() {
  const config = getConfig();
  console.log(`
OY - Personal AI Assistant for Termux
========================================
Model: ${config.model}
Mode : ${config.auto ? "AUTOPILOT" : "MANUAL"}
========================================
Type "help" for commands, "clear" to clean screen, "exit" to quit
`);
  rl.prompt();
  
  rl.on("line", async (line) => {
    if (isBusy) return;
    isBusy = true;
    const input = line.trim();
    if (!input) { rl.prompt(); isBusy = false; return; }

    if (waitingModel) {
      const num = parseInt(input);
      if (num >= 1 && num <= models.length) {
        saveConfig({ model: models[num - 1] });
        console.log(`\nModel changed to: ${models[num - 1]}\n`);
        waitingModel = false;
      } else console.log("\nInvalid choice\n");
      rl.prompt();
      isBusy = false;
      return;
    }

    if (input.toLowerCase() === "ganti model") {
      console.log("\nAvailable models:");
      models.forEach((m, i) => console.log(`  ${i+1}. ${m}`));
      console.log();
      waitingModel = true;
      rl.prompt();
      isBusy = false;
      return;
    }

    try { await runAI(input); } 
    catch (err) { console.log(`Error: ${err.message}\n`); }
    rl.prompt();
    isBusy = false;
  });
  
  rl.on("SIGINT", () => { console.log("\n\nBye!\n"); process.exit(0); });
}

start();