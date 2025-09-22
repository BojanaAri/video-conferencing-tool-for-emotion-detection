let mediaRecorder;
let recordedChunks = [];
let stream; // store the stream globally

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
    console.log(`Chunk uploaded: ${result.message}`);
  } catch (err) {
    console.error("Chunk upload error:", err);
  }
}

startBtn.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    videoEl.srcObject = stream;

    recordedChunks = [];

    let options = { mimeType: "video/webm; codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }

    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        await uploadChunk(e.data);
      }
    };

    mediaRecorder.start(5000); // send data every 5 seconds

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = "Recording...";
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message}`;
  }
});

stopBtn.addEventListener("click", () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    videoEl.srcObject = null;
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = "Stopped recording.";
});
