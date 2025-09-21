# GNUS-DAO DevContainer Dockerfile
# Optimized for security, performance, and Diamond Proxy development

# Use Node.js LTS as base image
FROM node:20-bookworm

# Build arguments
ARG NODE_VERSION=20
ARG PYTHON_VERSION=3.11
ARG GO_VERSION=1.21

# Environment variables for better Docker behavior
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    NODE_ENV=development \
    YARN_CACHE_FOLDER=/home/node/.yarn/cache \
    PATH="/home/node/.local/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Install system dependencies in a single layer for better caching
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools
    build-essential \
    cmake \
    pkg-config \
    # Development tools
    git \
    curl \
    wget \
    jq \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    # Python development
    python3-pip \
    python3-dev \
    python3-setuptools \
    python3-wheel \
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

# Install Go (needed for OSV-Scanner)
RUN wget -q https://go.dev/dl/go1.21.5.linux-amd64.tar.gz \
    && rm -rf /usr/local/go && tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz \
    && rm go1.21.5.linux-amd64.tar.gz

# Create non-root user for security
RUN groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/bash --create-home node \
    && mkdir -p /home/node/.local/bin /home/node/.yarn/cache \
    && chown -R node:node /home/node

# Switch to non-root user
USER node
WORKDIR /home/node

# Install Python security tools
RUN pip3 install --user --no-cache-dir \
    slither-analyzer \
    semgrep \
    trufflehog \
    && chmod +x /home/node/.local/bin/*

# Install additional security tools
RUN pip3 install --user --no-cache-dir \
    bandit \
    safety \
    pip-audit

# Install OSV-Scanner using Go
RUN go install github.com/google/osv-scanner/cmd/osv-scanner@latest

# Install Foundry (optional advanced testing)
RUN curl -L https://foundry.paradigm.xyz | bash \
    && /home/node/.foundry/bin/foundryup \
    && chmod +x /home/node/.foundry/bin/*

# Set up global npm packages (security tools)
RUN npm config set prefix /home/node/.npm-global \
    && export PATH="/home/node/.npm-global/bin:$PATH" \
    && npm install -g \
        snyk \
        @socketsecurity/cli \
        ganache \
        hardhat-shorthand \
        @openzeppelin/cli

# Create workspace directory
RUN mkdir -p /workspaces/gnus-dao
WORKDIR /workspaces/gnus-dao

# Copy package files for dependency installation optimization
COPY --chown=node:node package.json yarn.lock ./

# Install Yarn globally
RUN npm install -g yarn

# Configure Yarn for better performance
RUN yarn config set cache-folder /home/node/.yarn/cache \
    && yarn config set network-timeout 600000 \
    && yarn config set network-concurrency 8

# Pre-install dependencies (will be overridden by post-create script)
RUN yarn install --frozen-lockfile --prefer-offline || true

# Copy security configuration files
COPY --chown=node:node .semgrep.yml ./
COPY --chown=node:node slither.config.json ./
COPY --chown=node:node .gitsecretsignore ./

# Set up git-secrets globally
RUN git clone https://github.com/awslabs/git-secrets.git /tmp/git-secrets \
    && cd /tmp/git-secrets \
    && make install \
    && cd / \
    && rm -rf /tmp/git-secrets

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

# Expose ports for development
EXPOSE 8545 8546 3000 5000 8080

# Default command
CMD ["sleep", "infinity"]