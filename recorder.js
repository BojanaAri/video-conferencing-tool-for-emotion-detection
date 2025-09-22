let mediaRecorder;
let recordedChunks = [];

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const videoEl = document.getElementById("preview");

startBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
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

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      statusEl.textContent = "Uploading...";

      try {
        const resp = await fetch("http://127.0.0.1:8000/upload", {
          method: "POST",
          body: formData,
        });
        const result = await resp.json();
        statusEl.textContent = `Upload complete: ${result.message}`;
      } catch (err) {
        console.error(err);
        statusEl.textContent = `Upload error: ${err}`;
      }
    };

    mediaRecorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = "Recording...";
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message}`;
  }
});

stopBtn.addEventListener("click", () => {
  if (mediaRecorder) mediaRecorder.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = "Processing...";
});
