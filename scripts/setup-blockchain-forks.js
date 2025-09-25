// scripts/setup-blockchain-forks.js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class BlockchainForkManager {
  constructor() {
    this.networks = {
      ethereum: {
        rpc:
          process.env.ETHEREUM_RPC_URL ||
          "https://eth-mainnet.g.alchemy.com/v2/demo",
        chainId: 1,
        port: 8545,
      },
      polygon: {
        rpc:
          process.env.POLYGON_RPC_URL ||
          "https://polygon-mainnet.g.alchemy.com/v2/demo",
        chainId: 137,
        port: 8546,
      },
      arbitrum: {
        rpc:
          process.env.ARBITRUM_RPC_URL ||
          "https://arb-mainnet.g.alchemy.com/v2/demo",
        chainId: 42161,
        port: 8547,
      },
      optimism: {
        rpc:
          process.env.OPTIMISM_RPC_URL ||
          "https://opt-mainnet.g.alchemy.com/v2/demo",
        chainId: 10,
        port: 8548,
      },
    };

    this.processes = new Map();
  }

  async setupFork(networkName, options = {}) {
    if (!this.networks[networkName]) {
      throw new Error(`Unknown network: ${networkName}`);
    }

    const network = this.networks[networkName];
    const forkBlock = options.forkBlock || "latest";

    console.log(`Setting up ${networkName} fork at block ${forkBlock}...`);

    // Kill any existing process on this port
    await this.killProcessOnPort(network.port);

    // Start Hardhat network fork
    const args = [
      "node",
      "--network",
      "hardhat",
      "--fork",
      network.rpc,
      "--port",
      network.port.toString(),
      "--chain-id",
      network.chainId.toString(),
    ];

    if (forkBlock !== "latest") {
      args.push("--fork-block-number", forkBlock.toString());
    }

    const process = spawn("npx", ["hardhat", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
    });

    this.processes.set(networkName, process);

    // Wait for network to be ready
    await this.waitForNetwork(network.port);

    // Update Hardhat config for this network
    await this.updateHardhatConfig(networkName, network);

    console.log(`✅ ${networkName} fork ready on port ${network.port}`);

    return {
      network: networkName,
      port: network.port,
      chainId: network.chainId,
      rpc: `http://localhost:${network.port}`,
    };
  }

  async killProcessOnPort(port) {
    return new Promise((resolve) => {
      const kill = spawn("npx", ["kill-port", port.toString()]);
      kill.on("close", () => resolve());
      setTimeout(resolve, 2000); // Timeout after 2 seconds
    });
  }

  async waitForNetwork(port, maxAttempts = 30) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.makeRpcCall(port, "eth_chainId");
        if (response) {
          return true;
        }
      } catch (error) {
        // Network not ready yet
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error(
      `Network on port ${port} failed to start after ${maxAttempts} attempts`,
    );
  }

  async makeRpcCall(port, method, params = []) {
    const http = require("http");

    const postData = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: method,
      params: params,
    });

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: port,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const response = JSON.parse(data);
              resolve(response.result);
            } catch (error) {
              reject(error);
            }
          });
        },
      );

      req.on("error", reject);
      req.write(postData);
      req.end();
    });
  }

  async updateHardhatConfig(networkName, network) {
    const configPath = "hardhat.config.ts";
    const backupPath = `${configPath}.backup`;

    // Create backup if it doesn't exist
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(configPath, backupPath);
    }

    let config = fs.readFileSync(configPath, "utf8");

    // Add or update network configuration
    const networkConfig = `
    ${networkName}_fork: {
      url: "http://localhost:${network.port}",
      chainId: ${network.chainId},
      accounts: "remote",
      timeout: 60000
    },`;

    // Simple regex replacement - in production, use proper AST manipulation
    if (!config.includes(`${networkName}_fork:`)) {
      const networksMatch = config.match(/(networks:\s*{)/);
      if (networksMatch) {
        config = config.replace(
          networksMatch[1],
          `${networksMatch[1]}${networkConfig}`,
        );
      }
    }

    fs.writeFileSync(`${configPath}.parallel`, config);
    console.log(`Updated Hardhat config for ${networkName} fork`);
  }

  async cleanup() {
    console.log("Cleaning up blockchain forks...");

    for (const [networkName, process] of this.processes) {
      try {
        process.kill("SIGTERM");
        console.log(`Stopped ${networkName} fork`);
      } catch (error) {
        console.warn(`Failed to stop ${networkName} fork:`, error.message);
      }
    }

    this.processes.clear();
  }

  async setupMultipleForks(networks) {
    const results = [];

    for (const network of networks) {
      try {
        const result = await this.setupFork(network);
        results.push(result);
      } catch (error) {
        console.error(`Failed to setup ${network} fork:`, error.message);
      }
    }

    return results;
  }
}

// CLI usage
if (require.main === module) {
  const manager = new BlockchainForkManager();
  const networkName = process.argv
    .find((arg) => arg.startsWith("--network="))
    ?.split("=")[1];
  const forkBlock = process.argv
    .find((arg) => arg.startsWith("--fork-block="))
    ?.split("=")[1];

  if (!networkName) {
    console.error(
      "Usage: node setup-blockchain-forks.js --network=<ethereum|polygon|arbitrum|optimism> [--fork-block=<number|latest>]",
    );
    process.exit(1);
  }

  manager
    .setupFork(networkName, { forkBlock })
    .then((result) => {
      console.log("Fork setup result:", result);

      // Keep process alive for testing
      process.on("SIGINT", async () => {
        await manager.cleanup();
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error("Fork setup failed:", error);
      process.exit(1);
    });
}

module.exports = BlockchainForkManager;
