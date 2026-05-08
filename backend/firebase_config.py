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
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./serviceAccountKey.json")
        bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "")
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
