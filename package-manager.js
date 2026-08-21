// package-manager.js - OY Anti Halusinasi
const { safeExec } = require("./fs-shell");
const { getConfig } = require("./config-history");

async function installPackage(packageName, manager = "auto") {
  let detectedManager = manager;
  if (detectedManager === "auto") {
    try {
      await safeExec("which pkg", 3000);
      detectedManager = "pkg";
    } catch {
      try {
        await safeExec("which apt", 3000);
        detectedManager = "apt";
      } catch {
        detectedManager = "npm";
      }
    }
  }
  
  let command = "";
  switch(detectedManager) {
    case "pkg":
      command = `pkg install -y ${packageName}`;
      break;
    case "apt":
      command = `apt install -y ${packageName}`;
      break;
    case "npm":
      command = `npm install -g ${packageName}`;
      break;
    case "pip":
      command = `pip install ${packageName}`;
      break;
    default:
      return { error: "Package manager tidak dikenal" };
  }
  
  console.log(`[OY] Menginstall ${packageName} pake ${detectedManager}...`);
  return await safeExec(command);
}

async function listInstalledPackages(manager = "auto") {
  let detectedManager = manager;
  if (detectedManager === "auto") {
    try {
      await safeExec("which pkg", 3000);
      detectedManager = "pkg";
    } catch {
      try {
        await safeExec("which apt", 3000);
        detectedManager = "apt";
      } catch {
        detectedManager = "npm";
      }
    }
  }
  
  let command = "";
  switch(detectedManager) {
    case "pkg":
      command = "pkg list-installed";
      break;
    case "apt":
      command = "apt list --installed | head -50";
      break;
    case "npm":
      command = "npm list -g --depth=0";
      break;
    default:
      return { error: "Package manager tidak dikenal" };
  }
  
  console.log(`[OY] Lihat daftar paket terinstall (${detectedManager}):`);
  return await safeExec(command);
}

async function searchPackage(packageName, manager = "auto") {
  let detectedManager = manager;
  if (detectedManager === "auto") {
    try {
      await safeExec("which pkg", 3000);
      detectedManager = "pkg";
    } catch {
      try {
        await safeExec("which apt", 3000);
        detectedManager = "apt";
      } catch {
        detectedManager = "npm";
      }
    }
  }
  
  let command = "";
  switch(detectedManager) {
    case "pkg":
      command = `pkg search ${packageName}`;
      break;
    case "apt":
      command = `apt search ${packageName}`;
      break;
    case "npm":
      command = `npm search ${packageName}`;
      break;
    default:
      return { error: "Package manager tidak dikenal" };
  }
  
  console.log(`[OY] Mencari ${packageName} di ${detectedManager}...`);
  return await safeExec(command);
}

async function uninstallPackage(packageName, manager = "auto") {
  let detectedManager = manager;
  if (detectedManager === "auto") {
    try {
      await safeExec("which pkg", 3000);
      detectedManager = "pkg";
    } catch {
      try {
        await safeExec("which apt", 3000);
        detectedManager = "apt";
      } catch {
        detectedManager = "npm";
      }
    }
  }
  
  let command = "";
  switch(detectedManager) {
    case "pkg":
      command = `pkg uninstall ${packageName}`;
      break;
    case "apt":
      command = `apt remove -y ${packageName}`;
      break;
    case "npm":
      command = `npm uninstall -g ${packageName}`;
      break;
    default:
      return { error: "Package manager tidak dikenal" };
  }
  
  console.log(`[OY] Uninstall ${packageName} pake ${detectedManager}...`);
  return await safeExec(command);
}

module.exports = {
  installPackage,
  listInstalledPackages,
  searchPackage,
  uninstallPackage
};