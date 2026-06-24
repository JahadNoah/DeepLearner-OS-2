"""
Firebase Admin SDK initializer.
Place your serviceAccountKey.json in the backend/ directory.
Download it from: Firebase Console → Project Settings → Service Accounts → Generate new private key
"""
import firebase_admin
from firebase_admin import credentials
import os
from dotenv import load_dotenv

load_dotenv()

_app = None

def get_firebase_app():
    global _app
    if _app is None:
        bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "")

        # Hosted environments (Render/Cloud Run) can't ship the key file, so the
        # service-account JSON may be provided via env var instead — as raw JSON
        # or base64-encoded JSON. Falls back to a local file path otherwise.
        creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "").strip()
        if creds_json:
            import json
            import base64
            try:
                data = json.loads(creds_json)
            except json.JSONDecodeError:
                data = json.loads(base64.b64decode(creds_json).decode("utf-8"))
            cred = credentials.Certificate(data)
        else:
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./serviceAccountKey.json")
            cred = credentials.Certificate(cred_path)

        _app = firebase_admin.initialize_app(cred, {
            "storageBucket": bucket_name
        })
    return _app

def get_firestore():
    from firebase_admin import firestore
    get_firebase_app()
    return firestore.client()

def get_bucket():
    from firebase_admin import storage
    get_firebase_app()
    return storage.bucket()
