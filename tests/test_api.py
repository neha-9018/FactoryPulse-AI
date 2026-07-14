import sys
import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.app.main import app
from backend.app.api.deps import get_db
from backend.app.db.models import Base, User, Machine
from backend.app.core.security import get_password_hash

# Setup separate in-memory testing SQLite DB
TEST_DATABASE_URL = "sqlite:///./test_api.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestAPIEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        
        # Add test machines
        m1 = Machine(id=1, name="Test CNC Alpha", type="CNC_MILLING", location="Bay A", status="OPERATIONAL")
        m2 = Machine(id=2, name="Test Conveyor Beta", type="CONVEYOR", location="Bay B", status="OPERATIONAL")
        db.add_all([m1, m2])
        
        # Add mock role-based users
        u1 = User(username="admin_test", email="admin_test@meidensha.com", password_hash=get_password_hash("testpass"), role="ADMIN", is_active=True)
        u2 = User(username="op_test", email="op_test@meidensha.com", password_hash=get_password_hash("testpass"), role="OPERATOR", is_active=True)
        db.add_all([u1, u2])
        db.commit()
        db.close()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        try:
            if os.path.exists("./test_api.db"):
                os.remove("./test_api.db")
        except Exception:
            pass

    def test_login_flow(self):
        # 1. Login with bad credentials
        response = self.client.post("/api/v1/auth/login", data={"username": "admin_test", "password": "wrongpassword"})
        self.assertEqual(response.status_code, 400)
        
        # 2. Login with correct credentials
        response = self.client.post("/api/v1/auth/login", data={"username": "admin_test", "password": "testpass"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "ADMIN")

    def test_role_based_permissions(self):
        # 1. Get tokens for Admin and Operator
        admin_login = self.client.post("/api/v1/auth/login", data={"username": "admin_test", "password": "testpass"}).json()
        op_login = self.client.post("/api/v1/auth/login", data={"username": "op_test", "password": "testpass"}).json()
        
        admin_token = admin_login["access_token"]
        op_token = op_login["access_token"]
        
        # 2. Operator retrieves machines (permitted)
        resp = self.client.get("/api/v1/machines/", headers={"Authorization": f"Bearer {op_token}"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)
        
        # 3. Operator tries to update status to FAILING (restricted - returns 403)
        resp = self.client.put("/api/v1/machines/1/status", json={"status": "FAILING"}, headers={"Authorization": f"Bearer {op_token}"})
        self.assertEqual(resp.status_code, 403)
        
        # 4. Admin updates status to FAILING (permitted)
        resp = self.client.put("/api/v1/machines/1/status", json={"status": "FAILING"}, headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "FAILING")

if __name__ == "__main__":
    unittest.main()
