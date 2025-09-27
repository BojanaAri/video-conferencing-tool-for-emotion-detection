from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import tempfile
import os
import subprocess
from tensorflow.keras.models import load_model
import librosa
import json
from transformers import pipeline
import torch
import vosk
import soundfile as sf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],   
)

# Load models
model_video = load_model("EmotionDetectionImageModel.keras")
model_audio = load_model("AudioDetectionEmotionModel.keras")

emotions = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]

@app.options("/upload")  
async def upload_options():
    return JSONResponse(content={}, status_code=200)

def extract_audio_features(audio_file_path):
    """Extract audio features for emotion detection"""
    try:
        y, sr = librosa.load(audio_file_path, sr=22050, duration=30)  
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfccs_processed = np.mean(mfccs.T, axis=0)
        return mfccs_processed.reshape(1, -1)
    except Exception as e:
        print(f"Error processing audio: {e}")
        return np.zeros((1, 13))

def process_video_frames(video_path, max_frames=30):
    """Extract and process video frames for emotion detection"""
    cap = cv2.VideoCapture(video_path)
    frame_predictions = []
    frame_count = 0
    
    frame_skip = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) // max_frames)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % frame_skip == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            resized_frame = cv2.resize(gray, (48, 48))
            normalized_frame = resized_frame / 255.0
            input_frame = np.expand_dims(normalized_frame, axis=0)
            input_frame = np.expand_dims(input_frame, axis=-1)
            prediction = model_video.predict(input_frame, verbose=0)[0]
            frame_predictions.append(prediction)
        
        frame_count += 1
    
    cap.release()
    
    if frame_predictions:
        return np.mean(frame_predictions, axis=0)
    else:
        return np.zeros(7)
""""
def extract_audio_from_video(video_path, audio_output_path):
    #Extract audio using ffmpeg
    try:
        command = [
            "ffmpeg",
            "-i", video_path,
            "-vn",            # no video
            "-acodec", "pcm_s16le",  # raw audio
            "-ar", "22050",   # sample rate
            "-ac", "1",       # mono
            audio_output_path,
            "-y"              # overwrite
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception as e:
        print(f"ffmpeg error: {e}")
        return False """

def extract_audio_from_video(video_path, audio_output_path):
    try:
        command = [
            "ffmpeg",
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",   # sample rate changed to 16000
            "-ac", "1",
            audio_output_path,
            "-y"
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception as e:
        print(f"ffmpeg error: {e}")
        return False

# Initialize Vosk model and HuggingFace pipeline once
vosk_model_path = r"C:\Users\pc\vosk-model-small-en-us-0.15\vosk-model-small-en-us-0.15"
vosk_model = vosk.Model(vosk_model_path)
emotion_classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None,
    framework="pt"
)

def transcribe_audio_vosk(audio_path):
    """Transcribe audio to text using Vosk"""
    try:
        # Check if audio file exists and has content
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            print("Audio file is empty or doesn't exist")
            return ""
            
        rec = vosk.KaldiRecognizer(vosk_model, 16000)
        text_parts = []
        
        # Read audio file with soundfile
        audio_data, sample_rate = sf.read(audio_path)
        
        # Convert to mono if stereo and ensure correct data type
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)
        
        # Convert to 16-bit PCM format that Vosk expects
        audio_data = (audio_data * 32767).astype(np.int16)
        
        # Process in chunks
        chunk_size = 4000
        for i in range(0, len(audio_data), chunk_size):
            chunk = audio_data[i:i+chunk_size].tobytes()
            
            if rec.AcceptWaveform(chunk):
                result = json.loads(rec.Result())
                if 'text' in result and result['text'].strip():
                    text_parts.append(result['text'])
        
        # Get final result
        final_result = json.loads(rec.FinalResult())
        if 'text' in final_result and final_result['text'].strip():
            text_parts.append(final_result['text'])
        
        transcript = " ".join(text_parts).strip()
        print("Transcript:", transcript)
        return transcript
        
    except Exception as e:
        print("Vosk transcription error:", str(e))
        return ""

def predict_emotion_from_text(text):
    """Predict emotion from text using HuggingFace pipeline"""
    try:
        if not text:
            return np.zeros(len(emotions))
        results = emotion_classifier(text)[0]
        # Map HuggingFace labels to your emotion list
        label_map = {
            "anger": 0,
            "disgust": 1,
            "fear": 2,
            "joy": 3,
            "sadness": 4,
            "surprise": 5,
            "neutral": 6
        }
        scores = np.zeros(len(emotions))
        for r in results:
            idx = label_map.get(r['label'].lower())
            if idx is not None:
                scores[idx] = r['score']
        # Normalize to sum to 1
        if scores.sum() > 0:
            scores = scores / scores.sum()
        return scores
    except Exception as e:
        print("Emotion prediction error:", e)
        return np.zeros(len(emotions))

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    try:
        content = await file.read()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            audio_probs = np.zeros(7)
            video_probs = np.zeros(7)
            text_probs = np.zeros(7)
            transcript = "" 
            
            # Process video frames
            video_probs = process_video_frames(temp_file_path)
            
            # Extract and process audio
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as audio_temp:
                audio_temp_path = audio_temp.name
            
            if extract_audio_from_video(temp_file_path, audio_temp_path):
                # Check audio duration
                try:
                    y, sr = librosa.load(audio_temp_path, sr=None)
                    print(f"Extracted audio duration: {len(y)/sr:.2f} seconds, Sample rate: {sr}")
                except Exception as e:
                    print("Error loading extracted audio:", e)
                
                audio_features = extract_audio_features(audio_temp_path)
                audio_probs = model_audio.predict(audio_features, verbose=0)[0]
                # --- Speech context prediction ---
                transcript = transcribe_audio_vosk(audio_temp_path)
                print("Transcript for emotion prediction:", transcript)
                text_probs = predict_emotion_from_text(transcript)
            
            if os.path.exists(audio_temp_path):
                os.unlink(audio_temp_path)
            
            # Combine probabilities: 70% text, 30% (audio+video)
            av_probs = audio_probs + video_probs
            if av_probs.sum() > 0:
                av_probs = av_probs / av_probs.sum()
            final_probs = 0.7 * text_probs + 0.3 * av_probs
            top_emotion_index = np.argmax(final_probs)
            predicted_emotion = emotions[top_emotion_index]
            confidence = float(final_probs[top_emotion_index])
            
            response_data = {
                "message": f"Processed {file.filename}, size {len(content)} bytes",
                "predicted_emotion": predicted_emotion,
                "confidence": confidence,
                "audio_probs": audio_probs.tolist(),
                "video_probs": video_probs.tolist(),
                "text_probs": text_probs.tolist(),
                "transcript": transcript
            }
            print("Returning response:", response_data)
            return JSONResponse(response_data)
        
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except Exception as e:
        import traceback
        print("Exception:", e)
        traceback.print_exc()
        return JSONResponse({
            "error": f"Error processing file: {str(e)}",
            "message": f"Failed to process {file.filename}"
        }, status_code=500)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": True}
