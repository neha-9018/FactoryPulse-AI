import sys
import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.app.main import app
from backend.app.api.deps import get_db
from backend.app.db.models import Base, User, Machine, Prediction, Production, QualityInspection
from backend.app.core.security import get_password_hash

# Setup separate in-memory testing SQLite DB
TEST_DATABASE_URL = "sqlite:///./test_chat.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


class TestChatbotEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        
        # Add test user
        u = User(username="admin_chat", email="admin_chat@meidensha.com", password_hash=get_password_hash("testpass"), role="ADMIN", is_active=True)
        db.add(u)
        
        # Add test machine and prediction
        m = Machine(id=1, name="Test CNC Milling", type="CNC_MILLING", location="Bay A", status="OPERATIONAL")
        db.add(m)
        db.commit()
        
        p = Prediction(id=1, machine_id=1, timestamp=db.query(Machine).first().created_at, failure_probability=0.45, health_score=55.0, recommendation="Inspect spindle bearings.")
        db.add(p)
        
        # Add test production record
        pr = Production(id=1, machine_id=1, timestamp=db.query(Machine).first().created_at, shift_type="MORNING", production_count=800, defect_count=20, oee_score=74.1)
        db.add(pr)
        db.commit()
        db.close()
        
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        try:
            if os.path.exists("./test_chat.db"):
                os.remove("./test_chat.db")
        except Exception:
            pass

    def test_chatbot_intent_maintenance(self):
        login_resp = self.client.post("/api/v1/auth/login", data={"username": "admin_chat", "password": "testpass"}).json()
        token = login_resp["access_token"]
        
        response = self.client.post(
            "/api/v1/chatbot/query",
            json={"query": "Which machine needs maintenance?"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("response", data)
        self.assertIn("Test CNC Milling", data["response"])
        self.assertIn("Inspect spindle bearings", data["response"])

    def test_chatbot_intent_production(self):
        login_resp = self.client.post("/api/v1/auth/login", data={"username": "admin_chat", "password": "testpass"}).json()
        token = login_resp["access_token"]
        
        response = self.client.post(
            "/api/v1/chatbot/query",
            json={"query": "Summarize today's production yields"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("response", data)
        self.assertIn("800", data["response"])
        self.assertIn("74.1", data["response"])

if __name__ == "__main__":
    unittest.main()
