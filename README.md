# Blockchain Chat dApp

A decentralized chat application where every message is stored on an Ethereum-compatible blockchain through a Solidity smart contract. Users connect a MetaMask wallet, set a nickname, and send public or direct messages that are timestamped by the blockchain and appear live in the interface.

**Subject:** Blockchain | Department of Computer Engineering, University of Mumbai | Academic year 2026-2027

**Prepared by:** [Team member names and roll numbers]

---

## Table of Contents

1. [Features](#1-features)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Installation](#6-installation)
7. [Running the Project](#7-running-the-project)
8. [MetaMask Setup](#8-metamask-setup)
9. [Using the App](#9-using-the-app)
10. [Smart Contract Reference](#10-smart-contract-reference)
11. [Testing](#11-testing)
12. [Troubleshooting](#12-troubleshooting)
13. [Security Notes and Limitations](#13-security-notes-and-limitations)
14. [Future Scope](#14-future-scope)
15. [Outputs](#15-outputs)

---

## 1. Features

- Connect and disconnect a MetaMask wallet
- Register or change a nickname (3-20 characters)
- Send a public message (up to 280 characters)
- Send a direct message to a specific wallet address
- Messages store the sender, receiver, text and block timestamp
- Message history loads on connect, and new messages appear live through the `MessageSent` event
- Clear error messages for: wallet not connected, wrong network, rejected transaction, empty message, over-length message, invalid receiver address
- Messages are immutable: they cannot be edited or deleted

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity 0.8.x |
| Development and testing | Hardhat 2.x, Mocha, Chai |
| Frontend | React (Vite) |
| Blockchain library | ethers.js v6 |
| Wallet | MetaMask |
| Local blockchain | Hardhat Network (chain ID 31337) |

---

## 3. Architecture

```
 ┌──────────────┐    ethers.js    ┌─────────────────┐    JSON-RPC    ┌──────────────────┐
 │ React (Vite) │ ──────────────► │    MetaMask     │ ─────────────► │  Hardhat node    │
 │  frontend    │ ◄────────────── │ (signs and      │ ◄───────────── │  127.0.0.1:8545  │
 └──────────────┘    events       │  sends txs)     │                │  Chat.sol        │
                                  └─────────────────┘                └──────────────────┘
```

1. The user clicks an action in the React UI.
2. ethers.js asks MetaMask to sign the transaction.
3. MetaMask sends it to the Hardhat local node, where the `Chat` contract runs.
4. The contract stores the message and emits a `MessageSent` event.
5. The frontend listens for the event and refreshes the message list.

---

## 4. Project Structure

```
chat-dapp/
├── contracts-project/            Hardhat project (smart contract)
│   ├── contracts/
│   │   └── Chat.sol              The chat smart contract
│   ├── test/
│   │   └── Chat.js               Hardhat tests (Mocha/Chai)
│   ├── scripts/
│   │   └── deploy.js             Deployment script
│   ├── hardhat.config.js
│   └── package.json
├── frontend/                     React app (Vite)
│   ├── src/
│   │   ├── App.jsx               Chat interface and wallet logic
│   │   ├── App.css               Styling
│   │   ├── Chat.json             Contract ABI (copied from Hardhat artifacts)
│   │   ├── config.js             Contract address and chain ID
│   │   └── main.jsx
│   └── package.json
├── outputs/                      Screenshots and results
├── .gitignore
└── README.md
```

---

## 5. Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | 20 or 22 LTS (Node 24 was also tested and works) | https://nodejs.org |
| npm | Comes with Node.js | |
| Git | Latest | https://git-scm.com |
| VS Code | Latest | https://code.visualstudio.com |
| MetaMask | Browser extension (Chrome or Firefox) | https://metamask.io |

Optional VS Code extension: **Solidity** by Nomic Foundation (syntax highlighting and error checking).

Check the installs:

```bash
node -v
npm -v
git --version
```

> Hardhat 2 officially supports Node 18, 20 and 22. If you see compile or native module errors on a newer Node version, switch to Node 22 LTS.

---

## 6. Installation

### 6.1 Get the code

```bash
git clone <your-repository-url> chat-dapp
cd chat-dapp
```

If you are building from scratch instead of cloning, see section 6.4.

### 6.2 Install the contract project

```bash
cd contracts-project
npm install
```

### 6.3 Install the frontend

```bash
cd ../frontend
npm install
```

### 6.4 (Optional) Building the project from scratch

**Hardhat project:**

```bash
mkdir chat-dapp
cd chat-dapp
git init
mkdir contracts-project
cd contracts-project
npm init -y
npm install --save-dev hardhat@^2.22 @nomicfoundation/hardhat-toolbox@^5
npx hardhat init
```

At the prompts choose **Create a JavaScript project**, accept the default root, and answer yes to the `.gitignore` and dependency install questions. Then delete the sample `Lock.sol`, `Lock.js` test and `ignition/modules/Lock.js`, create a `scripts` folder, and add `Chat.sol`, `test/Chat.js` and `scripts/deploy.js`.

**React frontend:**

```bash
cd ..
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install ethers
```

If Vite asks about experimental options such as rolldown-vite, answer **No**. If it asks to install and start now, answer **No**.

> Run Hardhat commands only from inside `contracts-project`. Running them from `chat-dapp` gives "You are not inside a Hardhat project" (HH1) or tries to download a different Hardhat version. If `npx` offers to install Hardhat 3, answer **n** and change to the correct folder.

---

## 7. Running the Project

You need **three terminals**, all kept open while you use the app.

### Terminal 1: Start the local blockchain

```bash
cd contracts-project
npx hardhat node
```

This starts a local chain at `http://127.0.0.1:8545` and prints 20 test accounts, each with 10,000 test ETH and a private key. Leave it running.

### Terminal 2: Compile, test and deploy the contract

```bash
cd contracts-project
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network localhost
```

The deploy script prints a line like:

```
Chat deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

On a fresh node, the first deployment normally lands at this address.

### Connect the frontend to the contract

1. **Copy the ABI** (needed once, and again after any change to `Chat.sol`).

   Windows PowerShell, from the `chat-dapp` folder:

   ```powershell
   Copy-Item contracts-project\artifacts\contracts\Chat.sol\Chat.json frontend\src\Chat.json
   ```

   macOS or Linux:

   ```bash
   cp contracts-project/artifacts/contracts/Chat.sol/Chat.json frontend/src/Chat.json
   ```

2. **Set the contract address** in `frontend/src/config.js`:

   ```javascript
   export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
   export const CHAIN_ID = 31337;
   ```

   Always use the address printed by your latest deploy.

### Terminal 3: Start the frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in Chrome or Firefox with MetaMask installed.

### Restarting later

The local chain is not persistent. If you close `hardhat node` or restart your computer, the chain, the deployed contract, nicknames and messages are all lost. To start again:

1. Run `npx hardhat node` (Terminal 1).
2. Run the deploy command (Terminal 2) and check that `config.js` matches the printed address.
3. Clear MetaMask's activity data for each test account (see Troubleshooting).
4. Run `npm run dev` (Terminal 3).
5. Set the nicknames again.

Do not run the deploy command twice on the same node. A second deploy creates a second contract at a new address, and you would have to update `config.js` again.

---

## 8. MetaMask Setup

### 8.1 Create a wallet

Install the MetaMask extension and create a new wallet. Use a wallet dedicated to testing, and write down the recovery phrase.

### 8.2 Add the Hardhat Local network

Open the network dropdown, choose **Add a custom network**, and enter:

| Field | Value |
|---|---|
| Network name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | ETH |

MetaMask may warn that the chain ID or currency symbol does not match a known network (it may suggest "GoChain Testnet" and "GO"). This is expected for a local chain. Keep your values and save.

### 8.3 Import test accounts

1. In the `hardhat node` terminal, copy the private key shown under **Account #0**.
2. In MetaMask: click the account name, **Add account or hardware wallet**, **Import account**, paste the key, and import.
3. Repeat with **Account #1** and **Account #2**.
4. Rename them, for example Alice, Bob and Carol.

Each account should show 10,000 ETH on Hardhat Local.

> **Warning:** Hardhat's private keys are public knowledge. Use these accounts only on the local network, and never send real funds or tokens to them. On real networks, bots watch these addresses, which is why spam or failed transactions may appear in their Activity tab. Those entries are not from this project.

---

## 9. Using the App

1. Select an account in MetaMask on the **Hardhat Local** network.
2. Click **Connect MetaMask** and approve the popup.
3. Type a nickname (3-20 characters), click **Set nickname**, and confirm in MetaMask.
4. Use the **Public** tab to send a message to everyone, or the **Direct** tab and enter a receiver address to message one account. You can also click another user's name on a message to start a direct message to them.
5. Confirm each transaction in MetaMask. The message appears in the list when it is mined, with the sender, nickname and timestamp.
6. To chat between accounts, switch the selected account in MetaMask. The page reloads, so click **Connect MetaMask** again.
7. **Disconnect** clears the app's state. MetaMask itself stays connected to the site, because code cannot force MetaMask to disconnect.

Your own messages appear on the right, and other people's on the left. Public messages are visible to everyone. Direct messages are shown only to the sender and the receiver in the interface.

---

## 10. Smart Contract Reference

File: `contracts-project/contracts/Chat.sol`

```solidity
struct Message {
    address sender;
    address receiver;   // address(0) means a public message
    string  text;
    uint256 timestamp;  // block timestamp
}
```

| Function or event | Description |
|---|---|
| `registerNickname(string name)` | Sets the caller's nickname. Reverts unless it is 3-20 bytes long. |
| `sendMessage(address to, string text)` | Stores a message. Use the zero address for a public message. Reverts if the text is empty or longer than 280 bytes. |
| `getMessages()` | Returns the full message array. |
| `getMessageCount()` | Returns the number of stored messages. |
| `nicknames(address)` | Public mapping returning a user's nickname. |
| `event MessageSent(sender, receiver, text, timestamp)` | Emitted on every message. The frontend listens for it. |
| `event NicknameRegistered(user, name)` | Emitted when a nickname is set. |

Solidity measures string length in bytes, so characters outside basic ASCII (such as emoji) count as more than one unit.

---

## 11. Testing

### 11.1 Automated contract tests

```bash
cd contracts-project
npx hardhat test
```

Expected: 7 passing tests.

| Test | Checks |
|---|---|
| Sets a nickname | Nickname is stored for the caller |
| Rejects bad nicknames | Too short or too long reverts |
| Stores a public message | Sender, receiver (zero address) and text saved |
| Stores a direct message | Receiver address saved correctly |
| Rejects an empty message | Reverts with "Message cannot be empty" |
| Enforces the 280 limit | 280 allowed, 281 reverts |
| Emits MessageSent | Event emitted with the right arguments |

### 11.2 Manual tests (two or three MetaMask accounts)

| # | Test | Expected result |
|---|---|---|
| 1 | Connect as Alice and set a nickname | Header shows the nickname |
| 2 | Alice sends a public message | Message appears without refreshing the page |
| 3 | Switch to Bob and connect | Bob sees Alice's public message |
| 4 | Bob sends a direct message to Alice's address | Message shows a "Direct" tag |
| 5 | Switch to Alice | Alice sees Bob's direct message |
| 6 | Switch to Carol | Carol sees the public message but not the direct one |
| 7 | Switch MetaMask to another network and connect | "Wrong network" error |
| 8 | Send a message and click Reject in MetaMask | "Transaction rejected in MetaMask" error |
| 9 | Click Send with an empty message | "Message cannot be empty" error |
| 10 | Click Disconnect | Chat is hidden and the Connect button returns |

---

## 12. Troubleshooting

| Problem | Cause and fix |
|---|---|
| `Error HH1: You are not inside a Hardhat project` | You are in the wrong folder. Run `cd contracts-project` first. |
| `npx` offers to install `hardhat@3.x`, then `Error HHE3: No Hardhat config file found` | Same cause: wrong folder. Answer **n**, change to `contracts-project`, and run again. |
| "Nothing to compile" and "0 passing" | `Chat.sol` or `Chat.js` is missing or empty. Check `dir contracts` and `dir test`, and save the files with Ctrl+S. |
| `nvm` is not recognized (Windows) | nvm is not installed. You do not need it unless Hardhat fails on your Node version. |
| `running scripts is disabled` (PowerShell) | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. |
| Page connects, but nothing works or calls fail | `CONTRACT_ADDRESS` in `config.js` does not match the latest deploy. Copy the printed address. |
| "Wrong network" error | Switch MetaMask to Hardhat Local (chain ID 31337). |
| Nonce errors or "transaction failed" after restarting the node | Clear MetaMask's activity data for each account (see below). |
| Nickname does not show after setting it | Confirm the MetaMask popup, and check the `hardhat node` terminal for a `registerNickname` call. |
| Old spam or "Send failed" entries in Activity | Not from this project. They come from real networks, where Hardhat's public keys are watched by bots. Ignore them. |
| Layout is cut off at the bottom | Make sure `App.css` has only one copy of each rule, and use `100dvh` for page height. |

**Clearing MetaMask activity data:** select the account on Hardhat Local, open the menu, then Settings, Advanced, and choose **Clear activity tab data** (older versions call it **Reset account**). Do it for each test account. If your version does not have this option, delete the Hardhat Local network and add it again.

---

## 13. Security Notes and Limitations

- Every message is a blockchain transaction and costs (test) gas.
- All messages are public on-chain. Direct messages are only filtered in the user interface and are **not encrypted**. Anyone reading the chain directly can see them.
- Messages cannot be edited or deleted.
- There is no administrator, which is intentional in a decentralized design.
- The app never handles private keys. MetaMask signs every transaction.
- The contract checks input lengths. The frontend checks them as well, to give friendlier errors.
- The Hardhat accounts used for testing have publicly known private keys. Do not use them on any real network.

---

## 14. Future Scope

- End-to-end encryption of direct messages
- IPFS for attachments
- Deployment to a public testnet such as Sepolia, with the frontend hosted on a service like Vercel
- ENS names in place of nicknames

---

## 15. Outputs

Screenshots of the working application, test results and error cases are in the [`Blockchain`](./Blockchain) folder.
