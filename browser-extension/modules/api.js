class API {
    constructor() {
        this.baseURL = "http://127.0.0.1:8000";
    }

    async uploadChunk(blob) {
        const formData = new FormData();
        formData.append("file", blob, "recording_chunk.webm");
        
        try {
            const resp = await fetch(`${this.baseURL}/upload`, {
                method: "POST",
                body: formData,
            });
            
            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }
            
            return await resp.json();
        } catch (err) {
            console.error("API upload error:", err);
            throw err;
        }
    }

    async healthCheck() {
        try {
            const resp = await fetch(`${this.baseURL}/health`);
            return resp.ok;
        } catch (err) {
            return false;
        }
    }
}