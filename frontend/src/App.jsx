import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserProvider, Contract, ZeroAddress, isAddress } from "ethers";
import ChatArtifact from "./Chat.json";
import { CONTRACT_ADDRESS, CHAIN_ID } from "./config";
import "./App.css";

const short = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

function readableError(e) {
  if (e.code === "ACTION_REJECTED") return "Transaction rejected in MetaMask.";
  return e.reason || e.shortMessage || e.message || "Something went wrong.";
}

function Avatar({ addr, name, size = 36 }) {
  const hue = parseInt(addr.slice(2, 8), 16) % 360;
  const letter = name ? name[0].toUpperCase() : addr.slice(2, 4).toUpperCase();
  return (
    <div
      className="avatar"
      style={{ background: `hsl(${hue} 55% 45%)`, width: size, height: size }}
    >
      {letter}
    </div>
  );
}

export default function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [nickInput, setNickInput] = useState("");
  const [text, setText] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState("public");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  // Reload the page if the user switches account or network in MetaMask
  useEffect(() => {
    if (!window.ethereum) return;
    const reload = () => window.location.reload();
    window.ethereum.on("accountsChanged", reload);
    window.ethereum.on("chainChanged", reload);
    return () => {
      window.ethereum.removeListener("accountsChanged", reload);
      window.ethereum.removeListener("chainChanged", reload);
    };
  }, []);

  async function connect() {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask not found. Install the extension and refresh.");
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        setError("Wrong network. Switch MetaMask to Hardhat Local (chain ID 31337).");
        return;
      }
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());
      setContract(new Contract(CONTRACT_ADDRESS, ChatArtifact.abi, signer));
    } catch (e) {
      setError(readableError(e));
    }
  }

  function disconnect() {
    // MetaMask cannot be disconnected from code; this clears the app's state
    setAccount("");
    setContract(null);
    setMessages([]);
    setNicknames({});
    setError("");
    setText("");
    setTo("");
    setNickInput("");
    setMode("public");
  }

  const loadMessages = useCallback(async (c, acct) => {
    try {
      const raw = await c.getMessages();
      const list = raw.map((m) => ({
        sender: m.sender,
        receiver: m.receiver,
        text: m.text,
        timestamp: Number(m.timestamp),
      }));
      setMessages(list);
      const addrs = [
        ...new Set([acct, ...list.flatMap((m) => [m.sender, m.receiver])]),
      ].filter((a) => a && a !== ZeroAddress);
      const entries = await Promise.all(addrs.map(async (a) => [a, await c.nicknames(a)]));
      setNicknames(Object.fromEntries(entries));
    } catch (e) {
      setError(readableError(e));
    }
  }, []);

  // Load history and listen for new events
  useEffect(() => {
    if (!contract) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMessages(contract, account);
    const refresh = () => loadMessages(contract, account);
    contract.on("MessageSent", refresh);
    contract.on("NicknameRegistered", refresh);
    return () => {
      contract.off("MessageSent", refresh);
      contract.off("NicknameRegistered", refresh);
    };
  }, [contract, account, loadMessages]);

  async function saveNickname() {
    setError("");
    const name = nickInput.trim();
    if (name.length < 3 || name.length > 20) {
      setError("Nickname must be 3-20 characters.");
      return;
    }
    try {
      setBusy(true);
      const tx = await contract.registerNickname(name);
      await tx.wait();
      setNickInput("");
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setError("");
    const msg = text.trim();
    if (!msg) return setError("Message cannot be empty.");
    if (msg.length > 280) return setError("Message is over 280 characters.");
    let receiver = ZeroAddress;
    if (mode === "direct") {
      if (!isAddress(to.trim())) return setError("Receiver is not a valid address.");
      receiver = to.trim();
    }
    try {
      setBusy(true);
      const tx = await contract.sendMessage(receiver, msg);
      await tx.wait();
      setText("");
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  function replyTo(addr) {
    setMode("direct");
    setTo(addr);
  }

  const me = account.toLowerCase();
  const visible = messages.filter(
    (m) =>
      m.receiver === ZeroAddress ||
      m.sender.toLowerCase() === me ||
      m.receiver.toLowerCase() === me
  );
  const nameOf = (a) => (nicknames[a] ? `${nicknames[a]} (${short(a)})` : short(a));

  // Scroll to the newest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible.length]);

  return (
    <div className="page">
      <div className="card">
        <header className="header">
          <div className="brand">
            <span className="logo">⛓</span>
            <div>
              <h1>Blockchain Chat</h1>
              <p className="sub">Messages stored on-chain</p>
            </div>
          </div>
          <div className="header-right">
            <span className="net">
              <span className="dot" /> Hardhat Local · {CHAIN_ID}
            </span>
            {account && (
              <>
                <div className="pill">
                  <Avatar addr={account} name={nicknames[account]} size={26} />
                  <span>{nicknames[account] || short(account)}</span>
                </div>
                <button className="btn ghost" onClick={disconnect}>Disconnect</button>
              </>
            )}
          </div>
        </header>

        {!account ? (
          <section className="landing">
            <div className="hero-icon">💬</div>
            <h2>Chat without a server</h2>
            <p>
              Every message is a transaction on the blockchain. Connect your wallet to
              set a nickname and start chatting.
            </p>
            <div className="chips">
              <span>Immutable</span>
              <span>Timestamped</span>
              <span>Wallet identity</span>
            </div>
            <button className="btn primary big" onClick={connect}>
              Connect MetaMask
            </button>
          </section>
        ) : (
          <>
            <div className="nick">
              <input
                placeholder="Choose a nickname (3-20 characters)"
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
              />
              <button className="btn" onClick={saveNickname} disabled={busy}>
                Set nickname
              </button>
            </div>

            <div className="messages">
              {visible.length === 0 && (
                <div className="empty">
                  <div>🗨️</div>
                  <p>No messages yet. Say hello!</p>
                </div>
              )}
              {visible.map((m, i) => {
                const mine = m.sender.toLowerCase() === me;
                const isDM = m.receiver !== ZeroAddress;
                const when = new Date(m.timestamp * 1000);
                return (
                  <div key={i} className={`msg ${mine ? "mine" : "theirs"}`}>
                    {!mine && <Avatar addr={m.sender} name={nicknames[m.sender]} />}
                    <div className="bubble">
                      <div className="meta">
                        {mine ? (
                          <span className="sender">You</span>
                        ) : (
                          <button
                            className="sender link"
                            onClick={() => replyTo(m.sender)}
                            title="Send a direct message"
                          >
                            {nameOf(m.sender)}
                          </button>
                        )}
                        {isDM && <span className="tag">Direct → {nameOf(m.receiver)}</span>}
                      </div>
                      <div className="text">{m.text}</div>
                      <div className="time" title={when.toLocaleString()}>
                        {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="composer">
              <div className="tabs">
                <button
                  className={`tab ${mode === "public" ? "active" : ""}`}
                  onClick={() => setMode("public")}
                >
                  Public
                </button>
                <button
                  className={`tab ${mode === "direct" ? "active" : ""}`}
                  onClick={() => setMode("direct")}
                >
                  Direct
                </button>
              </div>
              {mode === "direct" && (
                <input
                  className="to"
                  placeholder="Receiver wallet address (0x...)"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              )}
              <div className="send-row">
                <input
                  placeholder={mode === "public" ? "Message everyone..." : "Write a direct message..."}
                  value={text}
                  maxLength={280}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && send()}
                />
                <button className="btn primary" onClick={send} disabled={busy}>
                  {busy ? "Waiting..." : "Send"}
                </button>
              </div>
              <div className="count">{text.length}/280</div>
            </div>
          </>
        )}

        {error && (
          <div className="toast" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        <footer className="footer">Contract {short(CONTRACT_ADDRESS)}</footer>
      </div>
    </div>
  );
}