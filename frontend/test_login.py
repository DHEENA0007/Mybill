import requests
import json

base = "http://localhost:3000/api"
r1 = requests.post(f"{base}/auth/login/", json={"username": "superadmin", "password": "password"})
print("Login status:", r1.status_code)
if r1.status_code == 200:
    token = r1.json().get('access')
    print("Has token:", bool(token))
    print("User from login:", r1.json().get('user', {}).get('username'))
    
    r2 = requests.get(f"{base}/users/me/", headers={"Authorization": f"Bearer {token}"})
    print("Me status:", r2.status_code)
    print("Me response:", r2.text[:200])
else:
    print(r1.text)
