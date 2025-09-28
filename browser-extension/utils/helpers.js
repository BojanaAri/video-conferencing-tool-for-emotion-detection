class Helpers {
    static formatTimestamp(date = new Date()) {
        return date.toLocaleString();
    }

    static generateFilename(extension = 'csv') {
        const date = new Date().toISOString().split('T')[0];
        return `emotion-report-${date}.${extension}`;
    }

    static validateData(predictionData) {
        return Array.isArray(predictionData) && predictionData.length > 0;
    }

    static createDataPoint(apiResult) {
        return {
            ...apiResult,
            timestamp: this.formatTimestamp(),
            chunkId: null // Will be set by the main controller
        };
    }
}