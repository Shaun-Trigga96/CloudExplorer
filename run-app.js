// run-app.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Create a prefix for logs
const createPrefix = (name, color) => {
  return `${color}[${name}]${colors.reset} `;
};

// Detect platform
const isWindows = process.platform === 'win32';
const npx = isWindows ? 'npx.cmd' : 'npx';
const node = isWindows ? 'node.exe' : 'node';

// Process configuration
const processes = [
  {
    name: 'BACKEND',
    command: node,
    args: ['server.js'],
    color: colors.green,
    cwd: './backend', // Backend directory
    essential: true, // Mark as essential process
  },
  {
    name: 'FRONTEND',
    command: npx,
    args: ['react-native', 'start'],
    color: colors.cyan,
    cwd: './', // Root project directory
    essential: true, // Mark as essential process
  }
];

// Determine which platform to run
let platform = null;
const args = process.argv.slice(2);
if (args.includes('--android') || args.includes('-a')) {
  platform = 'android';
} else if (args.includes('--ios') || args.includes('-i')) {
  platform = 'ios';
}

// Add emulator process if platform is specified
if (platform) {
  processes.push({
    name: platform.toUpperCase(),
    command: npx,
    args: ['react-native', `run-${platform}`],
    color: colors.magenta,
    cwd: './', // Root project directory
    delay: 5000, // Delay in ms before starting (to let Metro start first)
    essential: false, // Not essential for the app to run
  });
}

console.log(`${colors.bright}${colors.yellow}=== Starting CloudExplorer App ===${colors.reset}`);
console.log(`${colors.dim}Press Ctrl+C to stop all processes${colors.reset}\n`);

if (!platform) {
  console.log(`${colors.yellow}TIP: Run with --android (-a) or --ios (-i) to also launch the emulator${colors.reset}`);
  console.log(`${colors.yellow}Example: node run-app.js --android${colors.reset}\n`);
}

// Function to handle process output
const handleProcessOutput = (data, prefix) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      console.log(`${prefix}${line}`);
    }
  });
};

// Start each process
const runningProcesses = [];

// Function to start a process
const startProcess = (proc) => {
  console.log(`${colors.bright}Starting ${proc.name}...${colors.reset}`);
  
  // Check if the directory exists
  if (!fs.existsSync(proc.cwd)) {
    console.error(`${createPrefix(proc.name, colors.red)}Directory ${proc.cwd} does not exist!`);
    return null;
  }

  const childProcess = spawn(proc.command, proc.args, {
    cwd: proc.cwd,
    shell: true
  });
  
  const prefix = createPrefix(proc.name, proc.color);
  
  childProcess.stdout.on('data', (data) => {
    handleProcessOutput(data, prefix);
  });
  
  childProcess.stderr.on('data', (data) => {
    handleProcessOutput(data, prefix);
  });
  
  childProcess.on('close', (code) => {
    console.log(`${prefix}Process exited with code ${code}`);
    
    // If an essential process exits, terminate everything
    if (proc.essential && code !== 0) {
      console.error(`${colors.red}Essential process ${proc.name} exited unexpectedly. Shutting down...${colors.reset}`);
      process.emit('SIGINT');
    }
  });
  
  childProcess.on('error', (err) => {
    console.error(`${prefix}Failed to start process: ${err.message}`);
  });
  
  runningProcesses.push({
    process: childProcess,
    name: proc.name,
    essential: proc.essential || false
  });
  
  return childProcess;
};

// Start essential processes immediately
processes.forEach(proc => {
  if (!proc.delay) {
    startProcess(proc);
  }
});

// Start delayed processes
processes.forEach(proc => {
  if (proc.delay) {
    console.log(`${colors.dim}Will start ${proc.name} in ${proc.delay/1000} seconds...${colors.reset}`);
    setTimeout(() => startProcess(proc), proc.delay);
  }
});

// Handle script termination
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Stopping all processes...${colors.reset}`);
  
  runningProcesses.forEach(proc => {
    if (proc.process && !proc.process.killed) {
      console.log(`${colors.dim}Stopping ${proc.name}...${colors.reset}`);
      isWindows ? proc.process.kill() : proc.process.kill('SIGINT');
    }
  });
  
  // Force exit after a timeout
  setTimeout(() => {
    console.log(`${colors.red}Forcing exit...${colors.reset}`);
    process.exit(0);
  }, 3000);
});

// Create interactive console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
    process.emit('SIGINT');
  } else if (input.toLowerCase() === 'help') {
    console.log(`\n${colors.yellow}Available commands:${colors.reset}`);
    console.log('  quit, exit - Stop all processes and exit');
    console.log('  help - Show this help message');
    console.log('  status - Show status of running processes\n');
  } else if (input.toLowerCase() === 'status') {
    console.log(`\n${colors.yellow}Running processes:${colors.reset}`);
    runningProcesses.forEach(proc => {
      const status = proc.process.killed ? 'stopped' : 'running';
      console.log(`  ${proc.name}: ${status}`);
    });
    console.log('');
  }
});

console.log(`\n${colors.white}Type 'help' for available commands${colors.reset}\n`);