class Recorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.recordingInterval = null;
        this.userStopped = false;
        this.options = null;
    }

    async startRecording(onChunkReady) {
        try {
            this.userStopped = false;
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            this.options = { mimeType: "video/webm; codecs=vp8,opus" };
            if (!MediaRecorder.isTypeSupported(this.options.mimeType)) {
                this.options = { mimeType: "video/webm" };
            }
            
            this.startRecordingCycle(onChunkReady);
            
            // Stop and upload chunks every 5 seconds
            this.recordingInterval = setInterval(() => {
                if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
                    this.mediaRecorder.stop();
                }
            }, 5000);
            
            return true;
        } catch (err) {
            throw new Error(`Recording error: ${err.message}`);
        }
    }

    stopRecording() {
        this.userStopped = true;
        clearInterval(this.recordingInterval);
        
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    startRecordingCycle(onChunkReady) {
        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(this.stream, this.options);
        
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };
        
        this.mediaRecorder.onstop = async () => {
            const blob = new Blob(this.recordedChunks, { type: "video/webm" });
            await onChunkReady(blob);
            
            // Only restart if not stopped by user
            if (!this.userStopped) {
                this.startRecordingCycle(onChunkReady);
            }
        };
        
        this.mediaRecorder.start();
    }

    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === "recording";
    }
}