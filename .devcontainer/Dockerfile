# GNUS-DAO DevContainer Dockerfile
# Optimized for security, performance, and Diamond Proxy development
# Security approach: Node.js slim image (minimal attack surface), automatic security updates, pipx for Python tools
# Note: Any remaining vulnerabilities are in the Node.js runtime itself, maintained by the Node.js project

# Use Node.js LTS slim image for better security (fewer packages = fewer vulnerabilities)
FROM node:22-slim

# Build arguments
ARG NODE_VERSION=22
ARG PYTHON_VERSION=3.11
ARG GO_VERSION=1.21

# Environment variables for better Docker behavior
ENV DEBIAN_FRONTEND=noninteractive \
  PYTHONUNBUFFERED=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1 \
  NODE_ENV=development \
  YARN_CACHE_FOLDER=/home/node/.yarn/cache \
  PATH="/home/node/.local/bin:/home/node/.npm-global/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Install system dependencies in a single layer for better caching
# First update package lists and apply security updates
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
  # Basic system utilities (needed for slim image)
  ca-certificates \
  curl \
  wget \
  gnupg \
  # Build tools
  build-essential \
  cmake \
  pkg-config \
  # Development tools
  git \
  jq \
  lsb-release \
  software-properties-common \
  # Python development
  python3-pip \
  python3-dev \
  python3-setuptools \
  python3-wheel \
  pipx \
  # Security tools dependencies
  libssl-dev \
  libffi-dev \
  libxml2-dev \
  libxslt-dev \
  libyaml-dev \
  # Git and version control
  git-lfs \
  # Compression tools
  unzip \
  xz-utils \
  # Text processing
  grep \
  sed \
  gawk \
  # Network tools
  netcat-openbsd \
  dnsutils \
  # Process monitoring
  htop \
  procps \
  # File system tools
  tree \
  findutils \
  # Clean up
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get autoremove -y

# Create workspace directory as root before switching to node user
RUN mkdir -p /workspaces/gnus-dao && chown -R node:node /workspaces/gnus-dao

# Enable Corepack to manage Yarn version specified in package.json (must run as root)
RUN corepack enable

# Install git-secrets globally (must run as root)
RUN git clone https://github.com/awslabs/git-secrets.git /tmp/git-secrets \
  && cd /tmp/git-secrets \
  && make install \
  && cd / \
  && rm -rf /tmp/git-secrets

# Switch to non-root user (already created by base Node.js image)
USER node
WORKDIR /home/node

# Install Python security tools using pipx
RUN pipx install slither-analyzer \
  && pipx install semgrep \
  && pipx install trufflehog \
  && pipx ensurepath \
  && export PATH="$PATH:/home/node/.local/bin"

# Install additional security tools using pipx
RUN pipx install bandit \
  && pipx install safety \
  && pipx install pip-audit

# OSV-Scanner will be installed via post-create scripts after Go is available

# Install Foundry (optional advanced testing - non-fatal on network issues)
RUN curl -L https://foundry.paradigm.xyz | bash \
  && /home/node/.foundry/bin/foundryup \
  && chmod +x /home/node/.foundry/bin/* || true

# Set up global npm packages (security tools)
# Note: @openzeppelin/cli removed as it's deprecated; use @openzeppelin/hardhat-upgrades in project dependencies instead
RUN npm config set prefix /home/node/.npm-global \
  && export PATH="/home/node/.npm-global/bin:$PATH" \
  && npm install -g semver \
  && npm install -g \
  snyk \
  @socketsecurity/cli \
  ganache \
  hardhat-shorthand

# Workspace directory already created above, just set workdir
WORKDIR /workspaces/gnus-dao

# Copy package files for dependency installation optimization
COPY --chown=node:node package.json yarn.lock ./

# Configure Yarn for better performance (using project-specified version via Corepack)
RUN yarn config set cacheFolder /home/node/.yarn/cache

# Pre-install dependencies (will be overridden by post-create script)
RUN yarn install --frozen-lockfile --prefer-offline || true

# Copy security configuration files
COPY --chown=node:node .semgrep.yml ./
COPY --chown=node:node slither.config.json ./
COPY --chown=node:node .gitsecretsignore ./

# Configure git-secrets with blockchain-specific patterns
RUN git config --global secrets.patterns "0x[a-fA-F0-9]{64}" \
  && git config --global secrets.patterns "mnemonic.*[a-z]{3,}\s+[a-z]{3,}" \
  && git config --global secrets.patterns "INFURA_API_KEY|ALCHEMY_API_KEY|ETHERSCAN_API_KEY" \
  && git config --global secrets.patterns "PRIVATE_KEY|SECRET_KEY" \
  && git config --global secrets.allowed "0x0000000000000000000000000000000000000000"

# Create cache directories for performance
RUN mkdir -p \
  /workspaces/gnus-dao/node_modules \
  /workspaces/gnus-dao/artifacts \
  /workspaces/gnus-dao/cache \
  /workspaces/gnus-dao/diamond-abi \
  /workspaces/gnus-dao/diamond-typechain-types \
  /workspaces/gnus-dao/typechain-types \
  /workspaces/gnus-dao/coverage \
  /workspaces/gnus-dao/reports \
  /workspaces/gnus-dao/logs

# Set proper permissions
RUN chown -R node:node /workspaces/gnus-dao

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node --version && yarn --version && python3 --version && go version

# Security note: Post-create scripts will perform additional security validation and tool setup

# Expose ports for development
EXPOSE 8545 8546 3000 5000 8080

# Default command
CMD ["sleep", "infinity"]