import sys
import os

# Add parent directory to path so routes.py can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import create_app

# Vercel serves static files from dist/ via CDN — no static_dir needed here
app = create_app("")
