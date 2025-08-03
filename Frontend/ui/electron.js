import { app, BrowserWindow, dialog, net, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Logging Setup (No changes) ---
const logFilePath = path.join(app.getPath("userData"), "app.log");
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

const log = (message) => {
  const timestamp = (new Date()).toISOString();
  const logMessage = `[${timestamp}] ${message.toString().trim()}\n`;
  logStream.write(logMessage);
  process.stdout.write(logMessage);
};

const error = (message) => {
  const timestamp = (new Date()).toISOString();
  const errorMessage = `[${timestamp}] ERROR: ${message.toString().trim()}\n`;
  logStream.write(errorMessage);
  process.stderr.write(errorMessage);
};

console.log = log;
console.error = error;

// --- Global Variables ---
let pythonProcess = null;
let mainWindow = null;
let backendReady = false;

// --- Main Window and UI Functions (No changes) ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../dist/vite.svg")
  });
  
  mainWindow.maximize();
  
  const devUrl = "http://localhost:5173/";
  const prodPath = path.join(__dirname, "../dist/index.html");
  
  if (app.isPackaged) {
    mainWindow.loadFile(prodPath);
  } else {
    mainWindow.loadURL(devUrl);
  }

  // Send initial loading message after window is ready
  mainWindow.webContents.once('did-finish-load', () => {
    if (!backendReady) {
      updateLoadingIndicator('Starting AI backend... Please wait.');
    }
  });
}

function updateLoadingIndicator(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-loading', message);
  }
}


function hideLoadingIndicator() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('hide-loading');
  }
}

// --- NEW: Backend Setup and Management ---

const setupAndStartBackend = async () => {
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "app", "career-app")
    : path.join(__dirname, "..", "..", "..", "career-app");

  const venvPath = path.join(serverPath, "venv");
  const requirementsPath = path.join(serverPath, "requirements.txt");
  const portablePythonPath = path.join(serverPath, "python-portable", "python.exe");


  const systemPython = app.isPackaged
    ? portablePythonPath
    : (process.platform === 'win32' ? 'py' : 'python3');

  let pythonExecutable;

  // Step 1: Ensure virtual environment exists
  if (!fs.existsSync(venvPath)) {
    if (app.isPackaged && !fs.existsSync(systemPython)) {
      const errorMessage = `Bundled Python not found at: ${systemPython}`;
      error(errorMessage);
      dialog.showErrorBox("Fatal Error", errorMessage);
      app.quit();
      return;
    }

    try {
      await runCommand(systemPython, ['-m', 'venv', 'venv'], { cwd: serverPath });
      log("Virtual environment created successfully.");
    } catch (err) {
      error(`Failed to create virtual environment: ${err}`);
      dialog.showErrorBox("Fatal Error", `Failed to create the Python virtual environment. Please ensure Python 3 is installed and in your PATH. Error: ${err}`);
      app.quit();
      return;
    }
  } else {
    log("Virtual environment found.");
  }

  // Determine python executable inside venv
  pythonExecutable = process.platform === 'win32'
    ? path.join(venvPath, "Scripts", "python.exe")
    : path.join(venvPath, "bin", "python");

  // Step 2: Install dependencies from requirements.txt
  log("Installing dependencies...");
  updateLoadingIndicator("Installing required packages...");
  try {
    await runCommand(pythonExecutable, ['-m', 'pip', 'install', '-r', requirementsPath], { cwd: serverPath });
    if (process.platform === 'win32') {
      await runCommand(pythonExecutable, ['-m', 'pip', 'install', 'torch', 'torchvision', 'torchaudio', '--index-url', 'https://download.pytorch.org/whl/cu128'], { cwd: serverPath });
    }

    log("Dependencies installed successfully.");
  } catch (err) {
    error(`Failed to install dependencies: ${err}`);
    dialog.showErrorBox("Fatal Error", `Failed to install Python dependencies. Please check your internet connection and try again. Error: ${err}`);
    app.quit();
    return;
  }

  // Step 3: Start the backend server
  startBackendServer(pythonExecutable, serverPath);
};

// Helper function to run commands and return a promise
function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, options);

    process.stdout.on('data', (data) => log(`[${command}]: ${data}`));
    process.stderr.on('data', (data) => error(`[${command}]: ${data}`));

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}

const startBackendServer = (pythonExecutable, serverPath) => {
  log(`Attempting to start backend with: ${pythonExecutable}`);
  updateLoadingIndicator("Starting AI backend...");
  
  pythonProcess = spawn(pythonExecutable, [
    "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"
  ], {
    cwd: serverPath,
    stdio: "pipe"
  });

  pythonProcess.stdout.on("data", (data) => log(`Backend: ${data}`));
  pythonProcess.stderr.on("data", (data) => error(`Backend Error: ${data}`));
  pythonProcess.on("error", (err) => {
    error(`Failed to start backend process: ${err}`);
    dialog.showErrorBox("Backend Error", `Failed to start backend process: ${err.message}`);
    app.quit();
  });
  pythonProcess.on("close", (code) => {
    if (code !== 0) error(`Backend process exited with code ${code}`);
    backendReady = false;
  });

  waitForBackend();
};


// --- Backend Readiness Check (No changes) ---
const checkBackendReady = (callback) => {
  const request = net.request({
    method: "GET", protocol: "http:", hostname: "127.0.0.1", port: 8000, path: "/"
  });
  request.on("response", (response) => callback(response.statusCode === 200));
  request.on("error", () => callback(false));
  request.end();
};

const waitForBackend = () => {
  let attempts = 0;
  const maxAttempts = 30;
  const interval = 2000;

  const tryConnect = () => {
    checkBackendReady((ready) => {
      if (ready) {
        log("Backend is ready!");
        backendReady = true;
        hideLoadingIndicator();
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          log(`Backend not ready, retrying... (attempt ${attempts})`);
          setTimeout(tryConnect, interval);
        } else {
          error("Backend did not start within the expected time.");
          hideLoadingIndicator();
          dialog.showErrorBox("Backend Startup Error", "The AI backend failed to start in time. The app may not function correctly. Please try restarting.");
        }
      }
    });
  };

  tryConnect();
};

// --- App Lifecycle Events ---
app.whenReady().then(() => {
  log("App is ready. Starting setup...");
  
  // Call the new setup function instead of starting the backend directly
  setupAndStartBackend();
  createWindow();

  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  if (pythonProcess) {
    log("Killing backend process...");
    pythonProcess.kill();
    pythonProcess = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});