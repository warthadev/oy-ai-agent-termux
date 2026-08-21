// history-utils.js - OY Anti Halusinasi
const { chatHistory, saveHistory } = require("./config-history");

function getChatHistoryContext() {
  if (chatHistory.length === 0) return "";
  
  const lastChats = chatHistory.slice(-10);
  let context = "\nRIWAYAT PERCAKAPAN:\n";
  
  for (const chat of lastChats) {
    if (chat.role === "user") {
      context += `User: ${chat.parts[0].text}\n`;
    } else if (chat.role === "model") {
      let response = chat.parts[0].text;
      if (response.length > 300) response = response.slice(0, 300) + "...";
      context += `OY: ${response}\n`;
    }
  }
  
  return context;
}

async function saveToHistory(userInput, responseText) {
  chatHistory.push(
    { role: "user", parts: [{ text: userInput }] },
    { role: "model", parts: [{ text: responseText.slice(0, 2000) }] }
  );
  
  if (chatHistory.length > 100) {
    chatHistory.splice(0, chatHistory.length - 100);
  }
  
  await saveHistory();
}

module.exports = { getChatHistoryContext, saveToHistory };