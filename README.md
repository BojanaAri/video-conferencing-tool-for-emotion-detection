# video-conferencing-tool-for-emotion-detection
Tool for emotion detection

# Create a python virtual environment for the backend
```bash
cd api
python3 -m venv .venv    
# For Windows
venv\Scripts\activate 
# For MacOS / Linux
source .venv/bin/activate
pip install fastapi       
```

# To run the server
```bash
uvicorn main:app --reload   
```