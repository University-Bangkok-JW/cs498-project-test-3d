const express = require("express");
const multer = require("multer");
const axios = require("axios");
const googleTTS = require("google-tts-api");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
require("dotenv").config();

const app = express();
const port = 3000;

// Setup multer for audio upload
const upload = multer({ dest: "uploads/" });

// View engine and static files
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/voice-chat", upload.single("audio"), async (req, res) => {
  const audioPath = req.file.path;
  const outputPath = `${audioPath}.wav`;

  try {
    // Convert to 16kHz mono WAV for whisper.cpp
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y", "-i", audioPath, "-ar", "16000", "-ac", "1", outputPath
      ]);

      ffmpeg.on("close", code => {
        code === 0 ? resolve() : reject(new Error("FFmpeg conversion failed"));
      });
    });

    // Transcribe using whisper binary
    const transcription = await new Promise((resolve, reject) => {
      let result = "";

      const whisper = spawn("./whisper", [
        "-m", "models/ggml-base.en.bin",
        "-f", outputPath,
        "-nt", "-otxt"
      ]);

      whisper.stdout.on("data", data => result += data.toString());
      whisper.stderr.on("data", data => console.error("Whisper stderr:", data.toString()));

      whisper.on("close", code => {
        if (code === 0) {
          const lines = result.trim().split("\n");
          resolve(lines.pop() || "Sorry, I didn't catch that.");
        } else {
          reject(new Error("Whisper CLI failed"));
        }
      });
    });

    console.log("🎙️ User said:", transcription);

    // Send to DeepSeek
    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: transcription }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    console.log("🤖 AI replied:", reply);

    // Generate TTS URL
    const ttsUrl = googleTTS.getAudioUrl(reply, {
      lang: "en",
      slow: false,
      host: "https://translate.google.com",
    });

    res.json({ text: reply, audioUrl: ttsUrl });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Error processing voice chat.");
  } finally {
    // Cleanup temp files
    [audioPath, outputPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
