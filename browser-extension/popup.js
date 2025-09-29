class App {
    constructor() {
        this.recorder = new Recorder();
        this.api = new API();
        this.reportGenerator = new ReportGenerator();
        this.predictionData = [];
        this.currentEmotion = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.updateUI();
    }

    initializeElements() {
        this.startBtn = document.getElementById("startBtn");
        this.stopBtn = document.getElementById("stopBtn");
        this.reportBtn = document.getElementById("reportBtn");
        this.statusEl = document.getElementById("status");
        this.reportStatusEl = document.getElementById("reportStatus");
        this.videoEl = document.getElementById("preview");
        
        // Current Emotion elements
        this.currentEmotionEl = document.getElementById("currentEmotion");
        this.confidenceValueEl = document.getElementById("confidenceValue");
        this.confidenceBarEl = document.getElementById("confidenceBar");
        this.lastUpdateEl = document.getElementById("lastUpdate");
    }

    attachEventListeners() {
        this.startBtn.addEventListener("click", () => this.startRecording());
        this.stopBtn.addEventListener("click", () => this.stopRecording());
        this.reportBtn.addEventListener("click", () => this.generateReport());
    }

    async startRecording() {
        try {
            this.statusEl.textContent = "Starting recording...";
            
            await this.recorder.startRecording((blob) => this.handleChunkReady(blob));
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.statusEl.textContent = "Recording...";
            
        } catch (err) {
            this.statusEl.textContent = `Error: ${err.message}`;
            console.error("Start recording error:", err);
        }
    }

    stopRecording() {
        this.recorder.stopRecording();
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.statusEl.textContent = "Stopped recording";
        
        // Clear current emotion when stopping
        this.clearCurrentEmotion();
    }

    async handleChunkReady(blob) {
        try {
            const result = await this.api.uploadChunk(blob);
            const dataPoint = Helpers.createDataPoint(result);
            dataPoint.chunkId = this.predictionData.length + 1;
            
            this.predictionData.push(dataPoint);
            
            // Update current emotion display
            this.updateCurrentEmotion(dataPoint);
            this.updateUI();
            
            console.log(`Chunk ${dataPoint.chunkId} uploaded successfully`);
            
        } catch (err) {
            console.error("Error processing chunk:", err);
        }
    }

    updateCurrentEmotion(dataPoint) {
        this.currentEmotion = dataPoint;
        
        // Update emotion text
        this.currentEmotionEl.textContent = dataPoint.predicted_emotion || 'Unknown';
        this.currentEmotionEl.className = 'emotion-display ' + this.getEmotionColorClass(dataPoint.predicted_emotion);
        
        // Update confidence
        const confidencePercent = Math.round((dataPoint.confidence || 0) * 100);
        this.confidenceValueEl.textContent = `${confidencePercent}%`;
        this.confidenceBarEl.style.width = `${confidencePercent}%`;
        
        // Update timestamp
        this.lastUpdateEl.textContent = `Last update: ${dataPoint.timestamp}`;
    }

    clearCurrentEmotion() {
        this.currentEmotion = null;
        this.currentEmotionEl.textContent = '--';
        this.currentEmotionEl.className = 'emotion-display text-muted';
        this.confidenceValueEl.textContent = '--%';
        this.confidenceBarEl.style.width = '0%';
        this.lastUpdateEl.textContent = 'Last update: --';
    }

    getEmotionColorClass(emotion) {
        const colorMap = {
            'Happy': 'text-success',
            'Sad': 'text-primary',
            'Angry': 'text-danger',
            'Fear': 'text-warning',
            'Surprise': 'text-info',
            'Disgust': 'text-warning',
            'Neutral': 'text-secondary'
        };
        return colorMap[emotion] || 'text-dark';
    }

    generateReport() {
        if (!Helpers.validateData(this.predictionData)) {
            alert("No data collected yet. Please record some video first.");
            return;
        }

        try {
            const csvContent = this.reportGenerator.generateCSV(this.predictionData);
            const filename = Helpers.generateFilename('csv');
            
            this.reportGenerator.downloadReport(csvContent, filename);
            this.reportStatusEl.textContent = `Report generated: ${filename}`;
            
        } catch (err) {
            alert(`Error generating report: ${err.message}`);
            console.error("Report generation error:", err);
        }
    }

    updateUI() {
        this.reportStatusEl.textContent = `Collected ${this.predictionData.length} data points`;
        this.reportBtn.disabled = this.predictionData.length === 0;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});