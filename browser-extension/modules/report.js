class ReportGenerator {
    constructor() {
        this.emotions = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"];
    }

    generateCSV(predictionData) {
        if (!predictionData || predictionData.length === 0) {
            throw new Error("No data available for report generation");
        }

        let csvContent = "Emotion Analysis Report\n\n";
        
        // Summary Section
        csvContent += "SUMMARY\n";
        csvContent += `Total Recordings Analyzed,${predictionData.length}\n`;
        
        const emotionCounts = this.getEmotionCounts(predictionData);
        const mostCommonEmotion = this.getMostCommonEmotion(emotionCounts);
        const avgConfidence = this.getAverageConfidence(predictionData);
        
        csvContent += `Most Common Emotion,${mostCommonEmotion}\n`;
        csvContent += `Average Confidence,${(avgConfidence * 100).toFixed(1)}%\n\n`;
        
        // Emotion Distribution
        csvContent += "EMOTION DISTRIBUTION\n";
        csvContent += "Emotion,Count,Percentage\n";
        Object.entries(emotionCounts).forEach(([emotion, count]) => {
            const percentage = ((count / predictionData.length) * 100).toFixed(1);
            csvContent += `${emotion},${count},${percentage}%\n`;
        });
        
        csvContent += "\n";
        
        // Detailed Analysis
        csvContent += "DETAILED ANALYSIS\n";
        csvContent += "Timestamp,Emotion,Confidence,Transcript,Audio_Confidence,Video_Confidence,Text_Confidence\n";
        
        predictionData.forEach((data) => {
            const confidencePercent = (data.confidence * 100).toFixed(1);
            const transcript = data.transcript ? `"${data.transcript.replace(/"/g, '""')}"` : "No speech detected";
            const emotionIndex = this.emotions.indexOf(data.predicted_emotion);
            
            csvContent += `${data.timestamp},${data.predicted_emotion},${confidencePercent}%,${transcript},${(data.audio_probs[emotionIndex] * 100).toFixed(1)}%,${(data.video_probs[emotionIndex] * 100).toFixed(1)}%,${(data.text_probs[emotionIndex] * 100).toFixed(1)}%\n`;
        });
        
        return csvContent;
    }

    generateHTML(predictionData) {
        // Similar structure but returns HTML - you can implement this if needed
        return this.generateCSV(predictionData); // Fallback to CSV for now
    }

    downloadReport(content, filename, mimeType = 'text/csv;charset=utf-8;') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    getEmotionCounts(predictionData) {
        const emotionCounts = {};
        predictionData.forEach(data => {
            const emotion = data.predicted_emotion;
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
        return emotionCounts;
    }

    getMostCommonEmotion(emotionCounts) {
        return Object.keys(emotionCounts).reduce((a, b) => 
            emotionCounts[a] > emotionCounts[b] ? a : b
        );
    }

    getAverageConfidence(predictionData) {
        return predictionData.reduce((sum, data) => 
            sum + data.confidence, 0) / predictionData.length;
    }
}