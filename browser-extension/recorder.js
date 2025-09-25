let mediaRecorder;
let recordedChunks = [];
let stream; // store the stream globally
let recordingInterval;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");

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
    // Requesting user media
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    recordedChunks = [];

    let options = { mimeType: "video/webm; codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }

    mediaRecorder = new MediaRecorder(stream, options);

    // When data is available, store it and upload it
    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);  // Store data to upload later
      }
    };

    // When recording starts
    mediaRecorder.onstart = () => {
      statusEl.textContent = "Recording...";
      startBtn.disabled = true;
      stopBtn.disabled = false;
    };

    // When recording stops, upload the chunk
    mediaRecorder.onstop = async () => {
      if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        await uploadChunk(blob);  // Upload the chunk
      }

      // Reset recorded chunks for the next recording session
      recordedChunks = [];
      // Restart the recording after each stop
      mediaRecorder.start();
    };

    // Start the recording immediately
    mediaRecorder.start();

    // Set an interval to stop and restart recording every 10 seconds
    recordingInterval = setInterval(() => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop(); // Stop the recorder after 10 seconds
      }
    }, 10000); // 10 seconds interval

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = "Recording...";

  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message}`;
  }
});

stopBtn.addEventListener("click", () => {
  // Stop the recording and clear the interval when stop is pressed
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    clearInterval(recordingInterval); // Stop the interval to prevent further stops
    mediaRecorder.stop(); // Stop the current recording
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop()); // Stop the stream tracks
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = "Stopped recording.";
});
