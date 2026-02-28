import os
from dotenv import load_dotenv
from google import genai

load_dotenv(override=True)
key = os.getenv('GEMINI_API_KEY')
print("Loaded KEY:", key[:15] + "...")

client = genai.Client(api_key=key)
model_id = 'gemini-3-flash-preview'

print(f"\nTesting {model_id}...")
try:
    response = client.models.generate_content(
        model=model_id,
        contents='Say hello! Respond in 3 words max.'
    )
    print('SUCCESS:', response.text.strip())
except Exception as e:
    print('ERROR:', e)
