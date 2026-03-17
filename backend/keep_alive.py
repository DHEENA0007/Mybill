import time
import requests
import os

def ping_self():
    url = os.environ.get('APP_URL', 'https://mybill-u3mf.onrender.com/health/')
    print(f"Starting keep-alive pinger for {url}...")
    while True:
        try:
            response = requests.get(url)
            print(f"Ping successful at {time.ctime()} - Status: {response.status_code}")
        except Exception as e:
            print(f"Ping failed at {time.ctime()} - Error: {e}")
        
        # Wait for 5 minutes (300 seconds)
        time.sleep(300)

if __name__ == "__main__":
    ping_self()
