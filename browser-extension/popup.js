class App {
    constructor() {
        this.recorder = new Recorder();
        this.api = new API();
        this.reportGenerator = new ReportGenerator();
        this.predictionData = [];
        
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
    }

    async handleChunkReady(blob) {
        try {
            const result = await this.api.uploadChunk(blob);
            const dataPoint = Helpers.createDataPoint(result);
            dataPoint.chunkId = this.predictionData.length + 1;
            
            this.predictionData.push(dataPoint);
            this.updateUI();
            
            console.log(`Chunk ${dataPoint.chunkId} uploaded successfully`);
            
        } catch (err) {
            console.error("Error processing chunk:", err);
        }
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