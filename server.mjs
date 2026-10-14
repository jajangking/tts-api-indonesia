// TTS API service — Gemini TTS (gemini-3.8-flash-tts).
// Env: GEMINI_API_KEY (wajib), PORT (default 3000).
//   POST /api/tts   {text, voice?, language?, style?} -> audio/wav
//   GET  /api/voices -> JSON daftar voice
//   GET  /           -> halaman uji (key tidak terekspos)
import http from "http";
const KEY = process.env.GEMINI_API_KEY;
const PORT = Number(process.env.PORT || 3000);
const MODELS = ["gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];
const MODEL = MODELS[0];
const apiFor = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

const VOICES = [
  ["Kore", "Netral, cocok narasi"],
  ["Charon", "Maskulin dalam"],
  ["Fenrir", "Maskulin tegas"],
  ["Aoede", "Feminin lembut"],
  ["Callirrhoe", "Feminin ceria"],
  ["Autonoe", "Feminin tenang"],
  ["Enceladus", "Maskulin santai"],
  ["Iapetus", "Maskulin jernih"],
  ["Umbriel", "Maskulin kalem"],
  ["Algieba", "Netral halus"],
  ["Despina", "Feminin lugas"],
  ["Erinome", "Feminin jernih"],
].map(([name, desc]) => ({ name, desc }));

function wavHeader(dataLen, sampleRate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + dataLen, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22); h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(dataLen, 40);
  return h;
}

async function synth(text, voice, language, style) {
  const prompt = style
    ? `Say in the style of ${style}, in Indonesian language: ${text}`
    : `Say in Indonesian language: ${text}`;
  const bodies = [
    { contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["AUDIO"],
        speechConfig: { languageCode: language || "id-ID",
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Kore" } } } } },
    { contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Kore" } } } } },
  ];
  let lastErr = "";
  for (const model of MODELS) {
  for (const body of bodies) {
    const r = await fetch(apiFor(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { lastErr = (j.error && j.error.message) || ("HTTP " + r.status); continue; }
    const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    const p = parts.find((x) => x.inlineData && x.inlineData.data);
    if (p) return Buffer.from(p.inlineData.data, "base64");
    lastErr = "Respons API tidak berisi audio.";
  }
  }
  throw new Error(lastErr);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 200000) req.destroy(); });
    req.on("end", () => resolve(b));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  try {
    if (req.method === "GET" && req.url === "/api/voices") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ model: MODEL, defaultLanguage: "id-ID", voices: VOICES }, null, 2));
      return;
    }
    if (req.method === "GET" && req.url === "/samples") {
      const fs = await import("fs");
      const SAMPLES = process.env.SAMPLES_DIR || "./samples";
      const dir = SAMPLES;
      let files = [];
      try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".wav")); } catch {}
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><html><body style="font-family:sans-serif;max-width:640px;margin:40px auto">
<h2>Sampel Suara (klik play / download)</h2>
${files.map((f) => `<p><b>${f}</b><br><audio controls preload="none" src="/samples/${f}" style="width:100%"></audio><br><a href="/samples/${f}" download>download ${f}</a></p>`).join("") || "<p>Belum ada sampel.</p>"}
</body></html>`);
      return;
    }
    if (req.method === "GET" && req.url.startsWith("/samples/")) {
      const fs = await import("fs");
      const SAMPLES = process.env.SAMPLES_DIR || "./samples";
      const name = decodeURIComponent(req.url.slice("/samples/".length)).replace(/[^A-Za-z0-9._-]/g, "");
      const fp = SAMPLES + "/" + name;
      try {
        const st = fs.statSync(fp);
        if (!st.isFile()) throw 0;
        res.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": st.size });
        fs.createReadStream(fp).pipe(res);
      } catch { res.writeHead(404); res.end("not found"); }
      return;
    }
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><html><body style="font-family:sans-serif;max-width:640px;margin:40px auto">
<h2>TTS API Test</h2>
<textarea id="t" rows="5" style="width:100%">Jam di tanganmu berdetak 86 ribu kali sehari.</textarea><br><br>
<select id="v">${VOICES.map((v) => `<option>${v.name}</option>`).join("")}</select>
<input id="s" placeholder="style mis: Dosen Akademik" style="width:60%">
<button onclick="go()">Generate</button><br><br><audio id="a" controls style="width:100%"></audio>
<script>async function go(){
const r = await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({text:t.value,voice:v.value,language:'id-ID',style:s.value||undefined})});
if(!r.ok){alert(await r.text());return;}
document.getElementById('a').src = URL.createObjectURL(await r.blob());}</script></body></html>`);
      return;
    }
    if (req.method === "POST" && req.url === "/api/tts") {
      if (!KEY) { res.writeHead(500, { "Content-Type": "application/json" }); res.end('{"error":"GEMINI_API_KEY belum diset"}'); return; }
      const b = JSON.parse(await readBody(req));
      if (!b.text || typeof b.text !== "string" || !b.text.trim()) {
        res.writeHead(400, { "Content-Type": "application/json" }); res.end('{"error":"text wajib diisi"}'); return;
      }
      if (b.text.length > 5000) {
        res.writeHead(400, { "Content-Type": "application/json" }); res.end('{"error":"text maks 5000 karakter"}'); return;
      }
      const pcm = await synth(b.text.trim(), b.voice, b.language, b.style);
      const wav = Buffer.concat([wavHeader(pcm.length), pcm]);
      res.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": wav.length });
      res.end(wav);
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end('{"error":"not found"}');
  } catch (e) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String((e && e.message) || e) }));
  }
});

server.listen(PORT, () => console.log("TTS API on :" + PORT));
