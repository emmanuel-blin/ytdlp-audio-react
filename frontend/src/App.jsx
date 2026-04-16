import { useState, useRef, useCallback } from "react";
import "./App.css";

const FORMATS = ["mp3", "m4a", "opus", "flac", "wav"];

function parseUrls(text) {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"));
}

export default function App() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState("mp3");
  const [subdir, setSubdir] = useState("");
  // queue: [{ url, status: 'pending'|'downloading'|'ok'|'err', filename?, error? }]
  const [queue, setQueue] = useState([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef(false);

  const updateItem = (index, patch) =>
    setQueue((q) => q.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const handleStart = useCallback(async () => {
    const rawUrls = parseUrls(input);
    if (rawUrls.length === 0) return;

    abortRef.current = false;
    setRunning(true);

    const hasPlaylist = rawUrls.some((u) => u.includes("list=") && !u.includes("watch?v="));
    if (hasPlaylist) {
      setQueue([{ url: "Resolving playlists...", status: "downloading" }]);
    }

    const urls = [];
    for (const url of rawUrls) {
      if (url.includes("list=") && !url.includes("watch?v=")) {
        try {
          const r = await fetch("/api/playlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          const d = await r.json();
          if (d.entries) {
            urls.push(...d.entries.map((e) => e.url));
          } else {
            urls.push(url);
          }
        } catch {
          urls.push(url);
        }
      } else {
        urls.push(url);
      }
    }

    if (urls.length === 0 || abortRef.current) {
      setRunning(false);
      setQueue([]);
      return;
    }

    const initial = urls.map((url) => ({ url, status: "pending" }));
    setQueue(initial);

    for (let i = 0; i < urls.length; i++) {
      if (abortRef.current) break;
      setQueue((q) =>
        q.map((item, idx) => (idx === i ? { ...item, status: "downloading" } : item))
      );

      try {
        const r = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urls[i], format, subdir }),
        });
        const d = await r.json();

        if (d.error) {
          setQueue((q) =>
            q.map((item, idx) =>
              idx === i ? { ...item, status: "err", error: d.error } : item
            )
          );
        } else {
          setQueue((q) =>
            q.map((item, idx) =>
              idx === i ? { ...item, status: "ok", filename: d.filename } : item
            )
          );
        }
      } catch (e) {
        setQueue((q) =>
          q.map((item, idx) =>
            idx === i ? { ...item, status: "err", error: e.message } : item
          )
        );
      }
    }

    setRunning(false);
  }, [input, format, subdir]);

  const handleStop = () => {
    abortRef.current = true;
  };

  const urlCount = parseUrls(input).length;
  const doneCount = queue.filter((q) => q.status === "ok" || q.status === "err").length;
  const okCount = queue.filter((q) => q.status === "ok").length;
  const errCount = queue.filter((q) => q.status === "err").length;

  return (
    <div className="app">
      <header>
        <div className="logo-pill">yt-dlp</div>
        <h1>Audio <em>Downloader</em></h1>
        <p className="sub">Drop one or many links. Pick a format. Done.</p>
      </header>

      <main>
        <div className="card">
          <div className="field">
            <label htmlFor="url-input">
              URLs <span className="hint">(one per line or comma-separated)</span>
            </label>
            <textarea
              id="url-input"
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"https://youtube.com/watch?v=abc123\nhttps://youtube.com/watch?v=xyz789"}
              spellCheck={false}
              autoComplete="off"
              disabled={running}
            />
            {urlCount > 0 && !running && (
              <span className="url-count">{urlCount} URL{urlCount > 1 ? "s" : ""} detected</span>
            )}
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="fmt">Format</label>
              <select id="fmt" value={format} onChange={(e) => setFormat(e.target.value)} disabled={running}>
                {FORMATS.map((f) => (
                  <option key={f} value={f}>{f.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subdir">Subfolder <span className="hint">(optional)</span></label>
              <input
                id="subdir"
                type="text"
                value={subdir}
                onChange={(e) => setSubdir(e.target.value)}
                placeholder="e.g. podcasts"
                spellCheck={false}
                disabled={running}
              />
            </div>
          </div>

          {!running ? (
            <button
              className="dl-btn"
              onClick={handleStart}
              disabled={urlCount === 0}
            >
              Download{urlCount > 1 ? ` ${urlCount} files` : " audio"}
            </button>
          ) : (
            <button className="dl-btn stop" onClick={handleStop}>
              Stop after current
            </button>
          )}

          {queue.length > 0 && (
            <div className="progress-section">
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(doneCount / queue.length) * 100}%` }}
                />
              </div>
              <span className="progress-label">
                {doneCount}/{queue.length} done
                {okCount > 0 && <span className="tag-ok"> · {okCount} saved</span>}
                {errCount > 0 && <span className="tag-err"> · {errCount} failed</span>}
              </span>
            </div>
          )}

          {queue.length > 0 && (
            <div className="queue">
              {queue.map((item, i) => (
                <div key={i} className={`queue-item ${item.status}`}>
                  <span className="queue-icon">
                    {item.status === "pending" && "○"}
                    {item.status === "downloading" && <span className="spinner small" />}
                    {item.status === "ok" && "✓"}
                    {item.status === "err" && "✗"}
                  </span>
                  <div className="queue-detail">
                    <span className="queue-url">{item.url}</span>
                    {item.filename && <span className="queue-file">{item.filename}</span>}
                    {item.error && <span className="queue-error">{item.error}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="footer-note">
          Output volume: <code>/downloads</code> · mapped to your host folder via Docker
        </p>
      </main>
    </div>
  );
}
