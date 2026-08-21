// cli-utils.js - OY Anti Halusinasi
let loadingInterval;

function startLoading(msg = "Processing") {
  let dots = 0;
  process.stdout.write(`\r ${msg} `);
  loadingInterval = setInterval(() => {
    dots = (dots + 1) % 4;
    const dotStr = ".".repeat(dots);
    process.stdout.write(`\r ${msg} ${dotStr}  `);
  }, 500);
}

function stopLoading() {
  if (!loadingInterval) return;
  clearInterval(loadingInterval);
  process.stdout.write("\r\x1b[K");
  loadingInterval = null;
}

function cleanText(text) {
  if (!text) return "";
  
  let cleaned = text
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/`/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\b(nama_package|nama_file|perintah|command)\b/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return cleaned;
}

module.exports = {
  startLoading,
  stopLoading,
  cleanText
};