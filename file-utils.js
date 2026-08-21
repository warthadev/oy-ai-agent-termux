// file-utils.js - OY Anti Halusinasi
const fs = require("fs").promises;
const path = require("path");

async function getFolderContents(folderPath = ".") {
  try {
    const fullPath = path.resolve(process.cwd(), folderPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const folders = [];
    const files = [];
    for (const entry of entries) {
      if (entry.isDirectory()) folders.push(entry.name);
      else files.push(entry.name);
    }
    return { path: fullPath, folders: folders.sort(), files: files.sort(), total: folders.length + files.length };
  } catch (err) {
    return { error: err.message };
  }
}

async function readFileContent(filePath) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      console.log(`${filePath} adalah folder`);
      return null;
    }
    if (stats.size > 1024 * 1024) {
      console.log(`File terlalu besar (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      return null;
    }
    const content = await fs.readFile(fullPath, "utf8");
    const lines = content.split('\n');
    const preview = lines.slice(0, 100).join('\n');
    console.log(preview);
    if (lines.length > 100) console.log(`\n... dan ${lines.length - 100} baris lainnya`);
    return content;
  } catch (err) {
    console.log(`Gagal baca file: ${err.message}`);
    return null;
  }
}

async function writeToFile(filePath, content) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    await fs.writeFile(fullPath, content, "utf8");
    console.log(`File saved: ${filePath}`);
    return true;
  } catch (err) {
    console.log(`Error writing file: ${err.message}`);
    return false;
  }
}

async function createFolder(folderName) {
  try {
    const fullPath = path.resolve(process.cwd(), folderName);
    await fs.mkdir(fullPath, { recursive: true });
    console.log(`Folder created: ${folderName}`);
    return true;
  } catch (err) {
    console.log(`Error creating folder: ${err.message}`);
    return false;
  }
}

async function deleteFolder(folderName) {
  try {
    const fullPath = path.resolve(process.cwd(), folderName);
    await fs.rm(fullPath, { recursive: true, force: true });
    console.log(`Folder deleted: ${folderName}`);
    return true;
  } catch (err) {
    console.log(`Error deleting folder: ${err.message}`);
    return false;
  }
}

async function listDirectory(dirPath = ".") {
  try {
    const fullPath = path.resolve(process.cwd(), dirPath);
    const entries = await fs.readdir(fullPath);
    console.log(entries.join("\n"));
    return entries;
  } catch (err) {
    console.log(`Error listing directory: ${err.message}`);
    return [];
  }
}

module.exports = { 
  getFolderContents, 
  readFileContent, 
  writeToFile, 
  createFolder, 
  deleteFolder, 
  listDirectory
};