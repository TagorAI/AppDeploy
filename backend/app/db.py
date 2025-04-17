from supabase import create_client
from .config import get_settings

settings = get_settings()

# Supabase credentials
SUPABASE_URL = "https://nxejhuiacptdxzqcehvt.supabase.co"

SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54ZWpodWlhY3B0ZHh6cWNlaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5ODMwNTQsImV4cCI6MjA1NDU1OTA1NH0.To4rucTNvLIGLhkKKlKza0CXiyjf0k-cTS-JjOopFrw"

SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54ZWpodWlhY3B0ZHh6cWNlaHZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODk4MzA1NCwiZXhwIjoyMDU0NTU5MDU0fQ.uPDXGeDt7jehTt_FwAGuVi_0ez7WDSn63KE_5nSpqxA"

# Create Supabase clients using settings
supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) 