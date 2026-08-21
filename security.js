// security.js - OY Anti Halusinasi
const path = require("path");

function sanitizeCommand(cmd) {
  let cleanCmd = cmd.toString().trim();
  cleanCmd = cleanCmd.replace(/`/g, '').replace(/\n/g, ' ').replace(/\r/g, '');
  
  const dangerous = [
    /rm\s+-rf\s+\//i,
    /rm\s+-rf\s+~\/?$/i,
    /rm\s+-rf\s+\*/i,
    /dd\s+if=/i,
    /mkfs/i,
    /format/i,
    />\s*\/dev\/sd[a-z]/i,
    /\$\(.*\)/,
    /\|.*sh/i,
    /wget.*\|.*sh/i,
    /curl.*\|.*sh/i,
    /chmod\s+777\s+\//i,
    /sudo/i
  ];

  for (const pattern of dangerous) {
    if (pattern.test(cleanCmd)) {
      throw new Error(`Command ditolak: mengandung pola berbahaya`);
    }
  }

  const safePattern = /^(pwd|ls|cd|mkdir|touch|rm|cp|mv|echo|cat|head|tail|grep|find|which|whoami|date|cal|uptime|clear|npm|node|python|python3|git|touch|nano|vim|code|cursor|ollama|lsblk|df|du|free|top|htop|ps|kill|pkill|bg|fg|jobs|exit|history|man|help|alias|unalias|export|source|\.\s+\/|sh\s+|bash\s+|node\s+|python\s+|python3\s+|npm\s+|npx\s+|yarn\s+|pnpm\s+|bun\s+|go\s+|rustc\s+|cargo\s+|gcc\s+|g\+\s+|make\s+|cmake\s+)/i;
  
  if (!safePattern.test(cleanCmd) && !cleanCmd.match(/^[a-zA-Z0-9_\-\/\.\s]+$/)) {
    console.log(`[!] Perintah tidak dikenali: ${cleanCmd}`);
  }
  
  return cleanCmd;
}

function validateFilePath(fileName) {
  const fullPath = path.resolve(fileName);
  const workingDir = process.cwd();

  if (!fullPath.startsWith(workingDir)) {
    throw new Error(`Path ditolak: hanya boleh di dalam ${workingDir}`);
  }

  const blocked = [".env", ".git/config", "node_modules", "package-lock.json"];

  if (blocked.some((b) => fileName.includes(b))) {
    throw new Error(`File ditolak: ${path.basename(fileName)} adalah file sistem`);
  }

  return fullPath;
}

module.exports = { sanitizeCommand, validateFilePath };