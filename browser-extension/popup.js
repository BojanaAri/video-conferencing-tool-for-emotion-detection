let mediaRecorder;
let recordedChunks = [];
let stream;
let recordingInterval;
let options;
let userStopped = false;

let predictionData = []; // Array to store prediction data

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const videoEl = document.getElementById("preview");

async function uploadChunk(blob) {
  const formData = new FormData();
  formData.append("file", blob, "recording_chunk.webm");
  try {
    const resp = await fetch("http://127.0.0.1:8000/upload", {
      method: "POST",
      body: formData,
    });
    const result = await resp.json();
    predictionData.push(result);
    console.log(`Chunk uploaded: ${result.message}`);
  } catch (err) {
    console.error("Chunk upload error:", err);
  }
}

startBtn.addEventListener("click", async () => {
  try {
    userStopped = false;
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    options = { mimeType: "video/webm; codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }
    startRecordingCycle();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = "Recording...";
    recordingInterval = setInterval(() => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }, 5000);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  }
});

stopBtn.addEventListener("click", () => {
  userStopped = true;
  clearInterval(recordingInterval);
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = "Stopped.";
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});

function startRecordingCycle() {
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, options);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    await uploadChunk(blob);
    // Only restart if not stopped by user
    if (userStopped) {
      return;
    }
    startRecordingCycle();
  };
  mediaRecorder.start();
}
