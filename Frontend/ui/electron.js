import { app, BrowserWindow, dialog, net } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFilePath = path.join(app.getPath("userData"), "app.log");
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

const log = (message) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logMessage = `[${timestamp}] ${message.toString().trim()}
`;
  logStream.write(logMessage);
  process.stdout.write(logMessage);
};

const error = (message) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const errorMessage = `[${timestamp}] ERROR: ${message.toString().trim()}
`;
  logStream.write(errorMessage);
  process.stderr.write(errorMessage);
};

console.log = log;
console.error = error;

let pythonProcess = null;
let mainWindow = null;
let backendReady = false;

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

  // Show a loading indicator if backend isn't ready yet
  if (!backendReady) {
    showLoadingIndicator();
  }
}

function showLoadingIndicator() {
  // You can inject a loading screen or show a notification
  mainWindow.webContents.executeJavaScript(`
    if (!document.getElementById('backend-loading')) {
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'backend-loading';
      loadingDiv.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        z-index: 9999;
      \`;
      loadingDiv.innerHTML = 'Starting AI backend... Please wait.';
      document.body.appendChild(loadingDiv);
    }
  `).catch(() => {
    // Window might not be ready yet
  });
}

function hideLoadingIndicator() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(`
      const loadingDiv = document.getElementById('backend-loading');
      if (loadingDiv) {
        loadingDiv.remove();
      }
    `).catch(() => {
      // Window might not be ready yet
    });
  }
}

const startBackend = () => {
  const serverPath = app.isPackaged 
    ? path.join(process.resourcesPath, "app", "career-app") 
    : path.join(__dirname, "..", "..", "..", "career-app");
  
  const pythonExecutable = app.isPackaged 
    ? (process.platform === "win32" 
        ? path.join(serverPath, "venv", "Scripts", "python.exe") 
        : path.join(serverPath, "venv", "bin", "python"))
    : (process.platform === "win32" 
        ? path.join(serverPath, "venv", "Scripts", "python.exe")
        : path.join(serverPath, "venv", "bin", "python"));
  
  console.log(`Server path: ${serverPath}`);
  console.log(`Attempting to start backend with: ${pythonExecutable}`);
  console.log(`Python executable exists: ${fs.existsSync(pythonExecutable)}`);
  
  if (!fs.existsSync(pythonExecutable)) {
    const errorMessage = `Python executable not found at: ${pythonExecutable}`;
    console.error(errorMessage);
    dialog.showErrorBox("Backend Error", errorMessage);
    app.quit();
    return;
  }
  
  pythonProcess = spawn(pythonExecutable, [
    "-m",
    "uvicorn",
    "main:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8000"
  ], {
    cwd: serverPath,
    stdio: "pipe"
  });

  pythonProcess.stdout.on("data", (data) => {
    console.log(`Backend: ${data}`);
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Backend Error: ${data}`);
  });

  pythonProcess.on("error", (err) => {
    console.error(`Failed to start backend process: ${err}`);
    dialog.showErrorBox("Backend Error", `Failed to start backend process: ${err.message}`);
    app.quit();
  });

  pythonProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`Backend process exited with code ${code}`);
    }
    backendReady = false;
  });

  // Start checking for backend readiness
  waitForBackend();
};

const checkBackendReady = (callback) => {
  const request = net.request({
    method: "GET",
    protocol: "http:",
    hostname: "127.0.0.1",
    port: 8000,
    path: "/"
  });

  request.on("response", (response) => {
    callback(response.statusCode === 200);
  });

  request.on("error", () => {
    callback(false);
  });

  request.end();
};

const waitForBackend = () => {
  let attempts = 0;
  const maxAttempts = 30;
  const interval = 2000; // Check every 2 seconds instead of 10

  const tryConnect = () => {
    checkBackendReady((ready) => {
      if (ready) {
        console.log("Backend is ready!");
        backendReady = true;
        hideLoadingIndicator();
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Backend not ready, retrying in ${interval / 1000}s... (attempt ${attempts})`);
          setTimeout(tryConnect, interval);
        } else {
          const errorMessage = "Backend did not start within the expected time.";
          console.error(errorMessage);
          hideLoadingIndicator();
          dialog.showErrorBox("Backend Startup Error", errorMessage);
          // Don't quit the app, let user try manually or restart
        }
      }
    });
  };

  tryConnect();
};

app.whenReady().then(() => {
  console.log("App is ready. Starting backend and creating window...");
  
  // Start both processes concurrently
  startBackend();
  createWindow();

  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  if (pythonProcess) {
    console.log("Killing backend process...");
    pythonProcess.kill();
    pythonProcess = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});