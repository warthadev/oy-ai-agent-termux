// config-history.js - OY Anti Halusinasi
const fs = require("fs").promises;
const fsSync = require("fs");

const CONFIG_FILE = "agent_config.json";
const HISTORY_FILE = "chat_history.json";

const models = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-image",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-pro-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.7-flash"
];

let chatHistory = [];

async function loadHistory() {
  try {
    chatHistory = JSON.parse(await fs.readFile(HISTORY_FILE, "utf8"));
    if (chatHistory.length > 100) {
      chatHistory = chatHistory.slice(-100);
      await saveHistory();
    }
  } catch {
    chatHistory = [];
  }
}

async function saveHistory() {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
}

function readRawConfig() {
  try {
    return JSON.parse(fsSync.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function validateConfig(cfg) {
  let model = models.includes(cfg.model) ? cfg.model : "gemini-3.5-flash";
  const auto = typeof cfg.auto === "boolean" ? cfg.auto : true;
  return { model, auto };
}

function getConfig() {
  return validateConfig(readRawConfig());
}

function saveConfig(newConfig) {
  const merged = { ...getConfig(), ...newConfig };
  fsSync.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}

async function resetHistoryFile() {
  try {
    await fs.unlink(HISTORY_FILE);
  } catch {}
  chatHistory = [];
}

function isModelAvailable(modelName) {
  return models.includes(modelName);
}

function getStableModel() {
  return "gemini-3.5-flash";
}

module.exports = {
  models,
  chatHistory,
  loadHistory,
  saveHistory,
  resetHistoryFile,
  getConfig,
  saveConfig,
  isModelAvailable,
  getStableModel
};