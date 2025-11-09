import uvicorn
import logging
from api import app

# -------------------------------
# Configure logging
# -------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

if __name__ == "__main__":
    logging.info("🚀 Starting AI Image Search backend...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
