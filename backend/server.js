import express from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdirSync } from "fs";
import path from "path";

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json());

const OUTPUT_DIR = process.env.OUTPUT_DIR || "/downloads";

mkdirSync(OUTPUT_DIR, { recursive: true });

app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--dump-json",
      "--no-playlist",
      url,
    ], { timeout: 30_000 });

    const info = JSON.parse(stdout.trim().split("\n")[0]);
    res.json({
      title: info.title ?? "Unknown",
      duration: info.duration_string ?? "?",
      uploader: info.uploader ?? "Unknown",
      thumbnail: info.thumbnail ?? "",
    });
  } catch (err) {
    res.status(500).json({ error: err.stderr ?? err.message });
  }
});

app.post("/api/playlist", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--flat-playlist",
      "--dump-json",
      url,
    ], { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });

    const entries = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const info = JSON.parse(line);
        let parsedUrl = info.url ?? info.webpage_url ?? info.original_url ?? "";
        if (parsedUrl && !parsedUrl.startsWith("http")) {
          parsedUrl = `https://www.youtube.com/watch?v=${parsedUrl}`;
        }
        return {
          url: parsedUrl,
          title: info.title ?? "Unknown",
        };
      })
      .filter((e) => e.url);

    res.json({ count: entries.length, entries });
  } catch (err) {
    res.status(500).json({ error: err.stderr ?? err.message });
  }
});

app.post("/api/download", async (req, res) => {
  const { url, format = "mp3", subdir = "" } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  // Sanitize subdir: no absolute paths or traversal
  const safeSubdir = subdir.replace(/[^a-zA-Z0-9_\-. /]/g, "").replace(/\.\./g, "");
  const outputDir = safeSubdir
    ? path.join(OUTPUT_DIR, safeSubdir)
    : OUTPUT_DIR;

  mkdirSync(outputDir, { recursive: true });

  const template = path.join(outputDir, "%(title)s.%(ext)s");

  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--extract-audio",
      "--audio-format", format,
      "--audio-quality", "0",
      "--output", template,
      "--no-playlist",
      "--print", "after_move:filepath",
      url,
    ], { timeout: 300_000 });

    const lines = stdout.trim().split("\n").filter(Boolean);
    const filepath = lines[lines.length - 1];
    const filename = path.basename(filepath);

    res.json({ success: true, filename, filepath, outputDir });
  } catch (err) {
    const msg = (err.stderr ?? err.message ?? "").trim();
    res.status(500).json({ error: msg || "Download failed" });
  }
});

app.listen(3001, () => console.log("Backend listening on :3001"));