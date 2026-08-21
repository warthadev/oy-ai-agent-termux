// ai-core.js - OY Anti Halusinasi
const path = require("path");
const fs = require("fs").promises;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { models, getConfig, saveConfig, resetHistoryFile, loadHistory, chatHistory } = require("./config-history");
const { startLoading, stopLoading } = require("./cli-utils");
const { safeExec, execWithOutput } = require("./fs-shell");
const { getFolderContents, readFileContent, createFolder, writeToFile, deleteFolder } = require("./file-utils");
const { saveToHistory } = require("./history-utils");
const { installPackage, listInstalledPackages, searchPackage, uninstallPackage } = require("./package-manager");

let conversationMemory = [];
let lastCommandOutput = "";
let lastCommand = "";

async function isCommandSafe(command, userInput) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return true;
  
  const prompt = `Anda adalah asisten keamanan. Evaluasi apakah perintah ini berbahaya atau tidak.

Perintah: "${command}"
Konteks user: "${userInput}"

Perintah BERBAHAYA jika:
- Menghapus file sistem (rm -rf /, rm -rf ~, dll)
- Mengubah permission berbahaya (chmod 777 /, dll)
- Download dan execute script asing (wget ... | sh, curl ... | bash)
- Mengubah password atau user
- Menghentikan proses penting (kill -9, pkill, dll)
- Format disk (mkfs, dd, dll)

Jawab dengan format:
SAFE: [yes/no]
REASON: [alasan singkat dalam bahasa Indonesia]

Contoh:
SAFE: no
REASON: Perintah ini berbahaya karena bisa menghapus seluruh sistem.

SAFE: yes
REASON: Perintah ini aman untuk dijalankan.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: getConfig().model });
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    const isSafe = response.match(/SAFE:\s*(yes|no)/i);
    if (isSafe) {
      const safe = isSafe[1].toLowerCase() === 'yes';
      if (!safe) {
        const reason = response.match(/REASON:\s*(.+)/i);
        console.log(`\nOY menolak perintah ini!`);
        if (reason) console.log(`Alasan: ${reason[1]}`);
        else console.log(`Perintah ini dianggap berbahaya.`);
        console.log();
        return false;
      }
    }
    return true;
  } catch (err) {
    return true;
  }
}

async function executeCd(target, config) {
  const fullPath = path.resolve(process.cwd(), target);
  
  try {
    await fs.stat(fullPath);
  } catch {
    console.log(`Folder '${target}' tidak ditemukan\n`);
    return false;
  }
  
  try { 
    process.chdir(fullPath); 
    console.log(`Pindah ke: ${process.cwd()}`);
    return true;
  } catch (e) { 
    console.log(`Gagal: ${e.message}\n`);
    return false;
  }
}

async function getFolderSnapshot() {
  try {
    const files = await fs.readdir(".");
    const folders = [];
    const fileList = [];
    for (const f of files) {
      try {
        const stat = await fs.stat(f);
        if (stat.isDirectory()) folders.push(f);
        else fileList.push(f);
      } catch(e) {}
    }
    return { folders: folders.slice(0, 10), files: fileList.slice(0, 10) };
  } catch(e) {
    return { folders: [], files: [] };
  }
}

async function explainOutput(command, output, userInput) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  
  const prompt = `User menjalankan perintah: "${command}"
Output:
${output.substring(0, 1500)}

User bertanya: "${userInput}"

Jelaskan secara singkat dalam bahasa Indonesia yang mudah dipahami:
1. Apa arti output tersebut
2. Informasi penting apa yang bisa diambil
3. Jika ada error, jelaskan penyebabnya

Gaya bahasa santai, langsung ke inti, maksimal 3 paragraf.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: getConfig().model });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return null;
  }
}

async function runAI(userInput) {
  let config = getConfig();
  const lower = userInput.toLowerCase().trim();

  if (lower === "clear" || lower === "cls") { 
    console.clear(); 
    console.log(`\nOY > `);
    return { controlOnly: true }; 
  }
  
  if (lower === "exit" || lower === "quit") { 
    console.log("\nBye!\n"); 
    process.exit(0); 
  }
  
  if (lower === "reset") { 
    await resetHistoryFile(); 
    conversationMemory = [];
    lastCommand = "";
    lastCommandOutput = "";
    console.log("History cleared\n"); 
    return { controlOnly: true }; 
  }
  
  if (lower === "mode auto") { 
    saveConfig({ auto: true }); 
    console.log("AUTOPILOT ON\n"); 
    return { controlOnly: true }; 
  }
  
  if (lower === "mode manual") { 
    saveConfig({ auto: false }); 
    console.log("MANUAL MODE ON\n"); 
    return { controlOnly: true }; 
  }
  
  if (lower === "status") {
    const { stdout: disk } = await execWithOutput("df -h . | tail -1");
    const { stdout: mem } = await execWithOutput("free -h | grep Mem");
    const snapshot = await getFolderSnapshot();
    console.log(`\n${process.cwd()}`);
    console.log(`Disk: ${disk.trim()}`);
    console.log(`Memory: ${mem.trim()}`);
    console.log(`${snapshot.folders.length} folders, ${snapshot.files.length} files\n`);
    return { controlOnly: true };
  }

  if (lower === "ls") { await safeExec("ls -la"); console.log(); return { controlOnly: true }; }
  if (lower === "pwd") { console.log(process.cwd() + "\n"); return { controlOnly: true }; }
  if (lower.startsWith("cd ")) { await executeCd(lower.slice(3), config); return { controlOnly: true }; }
  if (lower.startsWith("pindah ke ")) { 
    const target = lower.slice(9).trim();
    await executeCd(target, config); 
    return { controlOnly: true }; 
  }
  if (lower.startsWith("cat ")) { await readFileContent(lower.slice(4)); return { controlOnly: true }; }
  if (lower.startsWith("mkdir ")) { await createFolder(lower.slice(6)); return { controlOnly: true }; }
  if (lower.startsWith("rm ")) { 
    const cmd = `rm -rf ${lower.slice(3)}`;
    const safe = await isCommandSafe(cmd, userInput);
    if (safe) await safeExec(cmd);
    console.log();
    return { controlOnly: true }; 
  }
  if (lower.startsWith("install ")) { await installPackage(lower.slice(8)); return { controlOnly: true }; }
  if (lower === "list packages") { await listInstalledPackages(); return { controlOnly: true }; }
  if (lower.startsWith("git ")) { await safeExec(`git ${lower.slice(4)}`); return { controlOnly: true }; }
  if (lower.startsWith("node ")) { await safeExec(`node ${lower.slice(5)}`); return { controlOnly: true }; }
  if (lower.startsWith("python ")) { await safeExec(`python ${lower.slice(7)}`); return { controlOnly: true }; }
  if (lower.startsWith("nano ")) { await safeExec(`nano ${lower.slice(5)}`); return { controlOnly: true }; }
  if (lower.startsWith("buat file ")) {
    const parts = lower.slice(9).trim().split(/\s+/);
    const fileName = parts[0];
    const content = parts.slice(1).join(" ") || "";
    await writeToFile(fileName, content);
    console.log();
    return { controlOnly: true };
  }

  if (lower.match(/(masuk|pindah|cd).*(terus|lalu|kemudian|trus|teruskan|dan).*(buka|cat|lihat|cari|grep|ada)/i)) {
    const cdMatch = lower.match(/(?:masuk|pindah)\s+ke\s+(\S+)/i);
    const afterStep = lower.split(/(?:terus|lalu|kemudian|trus|teruskan|dan)/i).pop().trim();
    
    if (cdMatch && afterStep) {
      const target = cdMatch[1];
      
      console.log(`\nMasuk ke ${target}...`);
      const cdResult = await executeCd(target, config);
      
      if (cdResult) {
        console.log(`\n${afterStep}`);
        
        const openMatch = afterStep.match(/(?:buka|lihat|cat)\s+(\S+\.\w+)/i);
        if (openMatch) {
          const file = openMatch[1];
          console.log(`\nMembaca ${file}...`);
          await readFileContent(file);
        }
        
        const searchMatch = afterStep.match(/(?:apakah ada|cari|temuin)\s+["']?(.+?)["']?(?:\s+(?:di|dalam|pada)\s+(\S+\.\w+))?/i);
        if (searchMatch) {
          let pattern = searchMatch[1].trim();
          let file = searchMatch[2] || "index.html";
          
          if (!searchMatch[2]) {
            const fileMatch = afterStep.match(/(\S+\.\w+)\s+(?:apakah ada|cari|temuin|ada)\s+["']?(.+?)["']?/i);
            if (fileMatch) {
              file = fileMatch[1];
              pattern = fileMatch[2] || pattern;
            }
          }
          
          pattern = pattern.replace(/^["']|["']$/g, '').trim();
          
          if (pattern && pattern.length > 1) {
            console.log(`\nMencari "${pattern}" di ${file}...`);
            const result = await execWithOutput(`grep -n "${pattern}" ${file} 2>/dev/null | head -20`);
            
            if (result.stdout) {
              console.log(`\nDitemukan "${pattern}" di ${file}:`);
              console.log(result.stdout);
              const count = result.stdout.split('\n').filter(l => l.trim()).length;
              console.log(`\nTotal: ${count} baris mengandung "${pattern}"`);
            } else {
              console.log(`\nTidak ditemukan "${pattern}" di ${file}`);
            }
          }
        }
        
        if (!openMatch && !searchMatch) {
          await safeExec(afterStep);
        }
        console.log();
      }
      return { controlOnly: true };
    }
  }

  if (lower.match(/^(cek|lihat|tampilkan|list)\s+/)) {
    const match = lower.match(/^(cek|lihat|tampilkan|list)\s+(.+)/);
    let target = match ? match[2].trim() : ".";
    
    const isFull = lower.includes("seluruh") || lower.includes("semua") || lower.includes("semuanya");
    const isSubfolder = lower.includes("sub") || lower.includes("rekursif");
    
    let cmd;
    if (isFull && isSubfolder) {
      cmd = `find ${target} -maxdepth 3 -type f 2>/dev/null | head -50`;
      console.log(`\n50 file pertama di ${target} (maks 3 level):`);
    } else if (isFull) {
      cmd = `ls -la ${target} 2>/dev/null | head -50`;
      console.log(`\n50 item pertama di ${target}:`);
    } else {
      cmd = `ls -la ${target} 2>/dev/null`;
      console.log(`\nIsi ${target}:`);
    }
    
    await safeExec(cmd);
    console.log();
    return { controlOnly: true };
  }

  if (lower.match(/^(cari|grep|temuin)\s+/i)) {
    const grepMatch = lower.match(/^(cari|grep|temuin)\s+["']?(.+?)["']?\s+(?:di|dalam|pada)\s+(\S+\.\w+)/i);
    if (grepMatch) {
      const pattern = grepMatch[2].trim();
      const file = grepMatch[3].trim();
      console.log(`\nMencari "${pattern}" di ${file}...`);
      const result = await execWithOutput(`grep -n "${pattern}" ${file} 2>/dev/null | head -20`);
      
      if (result.stdout) {
        console.log(result.stdout);
        const count = result.stdout.split('\n').filter(l => l.trim()).length;
        console.log(`\nDitemukan ${count} baris mengandung "${pattern}"`);
      } else {
        console.log(`\nTidak ditemukan "${pattern}" di ${file}`);
      }
      console.log();
      return { controlOnly: true };
    }
  }

  const explainMatch = lower.match(/^(ls|pwd|df|du|free|top|ps|whoami|uptime|date|cal|uname|which)\s*(.*)/);
  if (explainMatch) {
    const cmd = explainMatch[1];
    const args = explainMatch[2] || "";
    const fullCmd = `${cmd} ${args}`.trim();
    const needsExplain = userInput.match(/jelaskan|arti|maksud|apa itu|penjelasan/i);
    
    console.log(`\n${fullCmd}`);
    const result = await execWithOutput(fullCmd);
    
    if (result.stdout) {
      console.log(result.stdout);
      
      if (needsExplain) {
        console.log(`\nMenganalisis...`);
        const explanation = await explainOutput(fullCmd, result.stdout, userInput);
        if (explanation) {
          console.log(`\nPenjelasan:\n${explanation}\n`);
        }
      }
    }
    if (result.stderr) console.error(result.stderr);
    console.log();
    return { controlOnly: true };
  }
  
  if (lower === "help") {
    console.log(`
PERINTAH OY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Multi-step:
  masuk ke <folder> terus buka <file>
  pindah ke <folder> lalu cari "teks" di <file>

Cari:
  cari "teks" di file.ext

Navigasi:
  ls, pwd, cd <folder>, pindah ke <folder>
  
Baca file:
  cat <file>, buka <file>, lihat <file>
  
Buat/Hapus:
  mkdir <nama>, rm <file/folder>, buat file <nama> <isi>

Paket:
  install <paket>, list packages

Lainnya:
  git <perintah>, node <file>, python <file>, nano <file>
  mode auto, mode manual, status
  clear, exit, reset
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    return { controlOnly: true };
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("GOOGLE_API_KEY not set\n");
    return { controlOnly: true };
  }

  await loadHistory();
  
  const currentFiles = await fs.readdir(".").catch(() => []);
  const folderContent = currentFiles.slice(0, 15).join(", ");
  
  let context = `Current directory: ${process.cwd()}
Files here: ${folderContent || "(empty)"}

`;

  if (conversationMemory.length > 0) {
    context += `Recent conversation:\n`;
    const recent = conversationMemory.slice(-3);
    for (const mem of recent) {
      context += `User: ${mem.user}\nOY: ${mem.assistant.substring(0, 100)}...\n\n`;
    }
  }

  if (lastCommand) {
    context += `Last command: ${lastCommand}\nLast output: ${lastCommandOutput.substring(0, 200)}\n\n`;
  }

  const prompt = `You are OY, a Termux assistant. Be direct and honest. If you don't know something, say "I don't know".

${context}

User: "${userInput}"

RULES (STRICT):
1. If user asks to DO something (install, run, delete, create) → Output ONLY the shell command, nothing else
2. If user asks a QUESTION → Answer naturally in 1-2 sentences
3. If user asks "ada apa disitu" or similar → Describe what you see in the folder above
4. NEVER use placeholders like <file> or [name] - use actual names
5. NEVER say "dll" or "etc" - be specific
6. If command is dangerous (rm -rf /, etc), respond with "This command is dangerous and I won't run it."

EXAMPLES:
User: "install python" → pkg install python
User: "ada apa disini" → Di folder ini ada file index.js dan folder src.
User: "gimana cara buat file" → touch namafile.txt

Now respond:`;

  startLoading("OY");
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: config.model });
    const result = await geminiModel.generateContent(prompt);
    let response = result.response.text().trim();
    stopLoading();

    const isCommand = /^(pkg|apt|npm|pip|ls|cd|mkdir|rm|cp|mv|cat|echo|git|node|python|nano|touch|chmod|grep|find|ps|kill|df|free|top|clear|exit|head|tail|wc|sort|uniq|tar|zip|unzip|chown|chmod|ln|mount|umount)/i.test(response);
    
    if (isCommand && !userInput.match(/\?|bagaimana|gimana|apa itu|kenapa/i)) {
      const cmdToRun = response.split('\n')[0];
      
      const safe = await isCommandSafe(cmdToRun, userInput);
      if (!safe) {
        console.log(`\nOY menolak menjalankan: ${cmdToRun}`);
        console.log();
        return { controlOnly: false };
      }
      
      if (cmdToRun.startsWith("cd ")) {
        const target = cmdToRun.slice(3).trim();
        await executeCd(target, config);
        console.log();
        return { controlOnly: false };
      }
      
      lastCommand = cmdToRun;
      console.log(`\n${cmdToRun}`);
      
      try {
        const output = await execWithOutput(cmdToRun);
        lastCommandOutput = output.stdout || output.stderr || "Done";
        if (output.stdout) {
          console.log(output.stdout);
          
          if (userInput.match(/jelaskan|arti|maksud|apa itu|penjelasan/i)) {
            console.log(`\nMenganalisis...`);
            const explanation = await explainOutput(cmdToRun, output.stdout, userInput);
            if (explanation) {
              console.log(`\nPenjelasan:\n${explanation}\n`);
            }
          }
        }
        if (output.stderr) console.error(output.stderr);
      } catch(e) {
        lastCommandOutput = e.message;
        console.log(`Error: ${e.message}`);
      }
      console.log();
    } else {
      console.log(`\n${response}\n`);
    }
    
    conversationMemory.push({ user: userInput, assistant: response });
    if (conversationMemory.length > 10) conversationMemory.shift();
    
    await saveToHistory(userInput, response);
    return { controlOnly: false };
    
  } catch (err) {
    stopLoading();
    console.log(`Error: ${err.message}\n`);
    return { controlOnly: true };
  }
}

module.exports = { runAI };