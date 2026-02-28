import os
from google import genai
from PIL import Image
import io
import json

def classify_waste(image_bytes):
    """
    Takes an image (bytes) of a waste item, sends it to Gemini, 
    and returns a structured JSON result detailing how to dispose of it.
    """
    from dotenv import load_dotenv
    # override=True ensures that any changes to the .env file 
    # are picked up immediately by the running process.
    load_dotenv(override=True)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "error": "Gemini API key is not configured in your .env file.",
            "success": False
        }
        
    # Initialize the NEW Google GenAI Client
    client = genai.Client(api_key=api_key)

    try:
        # Load image for processing
        # The new SDK takes raw bytes or a PIL image. 
        # We'll use the PIL image as we've been doing.
        img = Image.open(io.BytesIO(image_bytes))
        
        # EXCLUSIVE MODEL USAGE: gemini-3-flash-preview (Strict User Requirement)
        model_id = 'gemini-3-flash-preview'
        
        prompt = """
        You are an expert waste sorting assistant. Look at the image provided and identify the waste item.
        Respond with ONLY a raw JSON object containing the following keys (do not wrap in markdown quotes):
        - "item": A short name for the item (e.g., "Plastic Water Bottle").
        - "category": Categorize strictly as one of: ["dry", "wet", "ewaste", "hazardous", "medical", "unknown"].
        - "recyclable": Boolean (true/false) indicating if it can be recycled.
        - "confidence": A number from 0 to 1 indicating your confidence in this classification.
        - "instructions": 1 or 2 short sentences on how to dispose of or recycle this specific item properly.
        - "reason": 1 sentence explaining why it goes in the selected category.
        - "contamination_risk": Strict string of either "Low", "Medium", or "High" indicating how easily this item can contaminate a recycling bin if not cleaned or sorted properly.
        - "tips": Array of 1 to 2 short string tips on how to prepare the item (e.g. ["Remove the cap", "Rinse thoroughly with water"]).
        
        Example:
        {
          "item": "Aluminum Soda Can",
          "category": "dry",
          "recyclable": true,
          "confidence": 0.98,
          "instructions": "Rinse out any remaining liquid and place it in the blue recycling bin.",
          "reason": "Aluminum is infinitely recyclable and falls under dry recyclable waste.",
          "contamination_risk": "Low",
          "tips": ["Rinse with water to remove sticky residue", "Crush to save space in the bin"]
        }
        """
        
        # Use the new generate_content syntax
        response = client.models.generate_content(
            model=model_id,
            contents=[prompt, img]
        )
        
        # Extract response text
        text = response.text.strip()
        
        # Clean up JSON formatting if the model used markdown blocks
        if text.startswith('```json'):
            text = text[7:]
        if text.endswith('```'):
            text = text[:-3]
        
        data = json.loads(text.strip())
        data["success"] = True
        return data
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def classify_waste_by_name(item_name: str):
    """
    Takes an item name as text (e.g., 'AA Battery', 'Pizza Box'),
    queries Gemini for classification and safe disposal instructions.
    """
    from dotenv import load_dotenv
    load_dotenv(override=True)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "Gemini API key is not configured.", "success": False}

    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert waste sorting assistant. A user wants to know how to safely dispose of the following item: "{item_name}".
    
    Respond with ONLY a raw JSON object (no markdown, no code fences) with these exact keys:
    - "item": The official/clean name of the item.
    - "category": One of: ["dry", "wet", "ewaste", "hazardous", "medical", "unknown"].
    - "recyclable": Boolean (true/false).
    - "confidence": 0 to 1 float indicating classification confidence.
    - "instructions": 1 to 2 clear sentences on HOW to dispose of this item safely.
    - "reason": 1 sentence WHY it belongs in this category.
    - "contamination_risk": Strictly one of: "Low", "Medium", or "High".
    - "tips": Array of 2 to 3 short actionable preparation tips (e.g. ["Drain all liquid", "Remove the label"]).
    - "do_not": Array of 1 to 2 things the user should absolutely NOT do (e.g. ["Do not throw in general trash", "Do not pour down drain"]).

    Example:
    {{
      "item": "AA Battery",
      "category": "hazardous",
      "recyclable": false,
      "confidence": 0.97,
      "instructions": "Take to a designated battery collection point or e-waste facility. Never dispose of in regular household bins.",
      "reason": "Batteries contain toxic heavy metals like cadmium and lead that can contaminate soil and water.",
      "contamination_risk": "High",
      "tips": ["Store in a cool, dry place until you can drop them off", "Keep terminals from touching metal objects", "Many supermarkets have free battery drop-off boxes"],
      "do_not": ["Do not throw in general waste", "Do not puncture or burn batteries"]
    }}
    """

    try:
        response = client.models.generate_content(
            model='gemini-3-flash-preview',
            contents=prompt
        )
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]

        data = json.loads(text.strip())
        data["success"] = True
        return data

    except Exception as e:
        print(f"Error in classify_waste_by_name: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # Quick self-test to verify the setup if run directly
    print("🚀 Running Gemini Helper Self-Test...")
    # Create a small dummy image for testing
    test_img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = io.BytesIO()
    test_img.save(img_byte_arr, format='JPEG')
    
    result = classify_waste(img_byte_arr.getvalue())
    if result.get("success"):
        print("✅ Success! Gemini connected and responded.")
        print(json.dumps(result, indent=2))
    else:
        print("❌ Test Failed!")
        print(f"Error: {result.get('error')}")
