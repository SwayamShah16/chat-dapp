import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract, ZeroAddress, isAddress } from "ethers";
import ChatArtifact from "./Chat.json";
import { CONTRACT_ADDRESS, CHAIN_ID } from "./config";
import "./App.css";

const short = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

function readableError(e) {
  if (e.code === "ACTION_REJECTED") return "Transaction rejected in MetaMask.";
  return e.reason || e.shortMessage || e.message || "Something went wrong.";
}

export default function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [nickInput, setNickInput] = useState("");
  const [text, setText] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    if (to.trim()) {
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

  const me = account.toLowerCase();
  const visible = messages.filter(
    (m) =>
      m.receiver === ZeroAddress ||
      m.sender.toLowerCase() === me ||
      m.receiver.toLowerCase() === me
  );
  const nameOf = (a) => (nicknames[a] ? `${nicknames[a]} (${short(a)})` : short(a));

  return (
    <div className="app">
      <h1>Blockchain Chat dApp</h1>

      {!account ? (
        <button onClick={connect}>Connect MetaMask</button>
      ) : (
        <>
          <div className="bar">
            <span>Connected: <b>{nameOf(account)}</b></span>
            <button onClick={disconnect}>Disconnect</button>
          </div>

          <div className="row">
            <input
              placeholder="Nickname (3-20 characters)"
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
            />
            <button onClick={saveNickname} disabled={busy}>Set nickname</button>
          </div>

          <div className="messages">
            {visible.length === 0 && <p className="muted">No messages yet.</p>}
            {visible.map((m, i) => (
              <div key={i} className={`msg ${m.sender.toLowerCase() === me ? "mine" : ""}`}>
                <div className="meta">
                  <b>{nameOf(m.sender)}</b>
                  {m.receiver !== ZeroAddress && <span className="dm"> → DM to {nameOf(m.receiver)}</span>}
                  <span className="time"> {new Date(m.timestamp * 1000).toLocaleString()}</span>
                </div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>

          <input
            placeholder="Receiver address (leave empty for a public message)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <div className="row">
            <input
              placeholder="Type a message (max 280)"
              value={text}
              maxLength={280}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && send()}
            />
            <button onClick={send} disabled={busy}>{busy ? "Waiting..." : "Send"}</button>
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}