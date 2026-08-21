// fs-shell.js - OY Anti Halusinasi
const { spawn, exec } = require("child_process");
const { sanitizeCommand } = require("./security");
const util = require("util");
const execPromise = util.promisify(exec);

let activeProcesses = [];

function safeExec(cmd, timeout = 60000) {
  return new Promise((resolve, reject) => {
    try {
      const sanitized = sanitizeCommand(cmd);
      console.log(`\n[OY] ${sanitized}`);
      
      const child = spawn(sanitized, {
        shell: true,
        stdio: "inherit"
      });

      activeProcesses.push(child);

      child.on("exit", (code) => {
        activeProcesses = activeProcesses.filter((p) => p !== child);
        if (code === 0) {
          resolve({ stdout: "", stderr: "", code });
        } else {
          reject(new Error(`Exit code ${code}`));
        }
      });

      child.on("error", (err) => {
        activeProcesses = activeProcesses.filter((p) => p !== child);
        reject(err);
      });

      const timer = setTimeout(() => {
        if (activeProcesses.includes(child)) {
          child.kill();
          reject(new Error("Timeout"));
        }
      }, timeout);
      
      child.on("exit", () => clearTimeout(timer));
    } catch (err) {
      reject(err);
    }
  });
}

async function execWithOutput(cmd) {
  try {
    const sanitized = sanitizeCommand(cmd);
    const { stdout, stderr } = await execPromise(sanitized, { timeout: 10000 });
    return { stdout: stdout || "", stderr: stderr || "", error: null };
  } catch (error) {
    return { stdout: "", stderr: error.message, error };
  }
}

module.exports = {
  activeProcesses,
  safeExec,
  execWithOutput
};