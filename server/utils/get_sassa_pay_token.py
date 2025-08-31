import os
import requests
import json
from requests.auth import HTTPBasicAuth


def token():
    """Get SasaPay access token"""
    try:
        url = "https://sandbox.sasapay.app/api/v1/auth/token/?grant_type=client_credentials"
        params = {"grant_type": "client_credentials"}
        
        client_id = os.environ.get("CLIENT_ID")
        client_secret = os.environ.get("CLIENT_SECRET")
        
        if not client_id or not client_secret:
            print("Warning: CLIENT_ID or CLIENT_SECRET environment variables not set")
            return None
            
        res = requests.get(
            url,
            auth=HTTPBasicAuth(client_id, client_secret),
            params=params,
            timeout=10
        )
        
        if res.status_code != 200:
            print(f"Error getting token: HTTP {res.status_code}")
            return None
            
        response = json.loads(res.text)
        access_token = response.get("access_token")
        
        if not access_token:
            print("Error: No access_token in response")
            return None
            
        return access_token
        
    except requests.exceptions.RequestException as e:
        print(f"Network error getting token: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error getting token: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error getting token: {e}")
        return None


# Only execute if this file is run directly (not imported)
if __name__ == "__main__":
    print(token())
