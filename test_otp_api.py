import urllib.request, json

# Test send-otp
data = json.dumps({"email": "test@test.com"}).encode()
req = urllib.request.Request("http://127.0.0.1:8001/send-otp", data=data, method="POST")
req.add_header("Content-Type", "application/json")
try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        print("Send OTP:", resp.status, resp.read().decode())
except Exception as e:
    print("Error:", e)

# Test verify-otp (use the OTP that was just sent - but we need to get it from the store)
# Let's test verify with a known OTP
data2 = json.dumps({"email": "test@test.com", "otp": "000000"}).encode()
req2 = urllib.request.Request("http://127.0.0.1:8001/verify-otp", data=data2, method="POST")
req2.add_header("Content-Type", "application/json")
try:
    with urllib.request.urlopen(req2, timeout=5) as resp:
        print("Verify OTP:", resp.status, resp.read().decode())
except Exception as e:
    print("Error:", e)