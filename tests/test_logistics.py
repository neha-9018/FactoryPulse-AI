import os
import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.app.main import app
from backend.app.api.deps import get_db
from backend.app.db.models import Base, User, WMSInventory, WCSConveyorState, WESMovementTask
from backend.app.core.security import get_password_hash

# Setup separate in-memory testing SQLite DB
TEST_DATABASE_URL = "sqlite:///./test_logistics.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


class TestLogisticsEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        
        # 1. Seed admin user
        admin_user = User(
            username="admin",
            email="admin@meidensha.com",
            password_hash=get_password_hash("admin123"),
            role="ADMIN",
            is_active=True
        )
        db.add(admin_user)
        
        # 2. Seed WMS raw stocks
        db.add(WMSInventory(item_name="Raw Castings", item_code="CAST_RAW", quantity=250, min_threshold=40, unit="units"))
        db.add(WMSInventory(item_name="Bearing Seals", item_code="SEAL_RAW", quantity=180, min_threshold=30, unit="units"))
        
        # 3. Seed WCS conveyor state
        db.add(WCSConveyorState(
            name="MAIN_CONVEYOR",
            is_running=False,
            speed_mps=0.0,
            direction="FORWARD",
            motor_temp=35.5,
            current_cargo=None,
            status="IDLE"
        ))
        db.commit()
        db.close()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        try:
            if os.path.exists("./test_logistics.db"):
                os.remove("./test_logistics.db")
        except Exception:
            pass

    def get_auth_headers(self):
        response = self.client.post(
            "/api/v1/auth/login",
            data={"username": "admin", "password": "admin123"}
        )
        self.assertEqual(response.status_code, 200)
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}

    def test_get_logistics_inventory(self):
        """Verify that inventory items are fetched successfully."""
        headers = self.get_auth_headers()
        response = self.client.get("/api/v1/logistics/inventory", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(isinstance(data, list))
        self.assertTrue(len(data) > 0)
        self.assertTrue(data[0]["item_name"] in ["Raw Castings", "Bearing Seals"])

    def test_get_conveyor_state(self):
        """Verify WCS Conveyor state endpoint yields correct layout."""
        headers = self.get_auth_headers()
        response = self.client.get("/api/v1/logistics/conveyor", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "MAIN_CONVEYOR")
        self.assertFalse(data["is_running"])
        self.assertEqual(data["status"], "IDLE")

    def test_conveyor_direct_control(self):
        """Verify WCS equipment control commands adjust speed and run status."""
        headers = self.get_auth_headers()
        
        # 1. Start Conveyor Command
        response = self.client.post(
            "/api/v1/logistics/conveyor/control",
            headers=headers,
            json={"command": "START", "speed": 1.2}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertTrue(data["conveyor"]["is_running"])
        self.assertEqual(data["conveyor"]["speed_mps"], 1.2
        )
        
        # 2. Stop Conveyor Command
        response = self.client.post(
            "/api/v1/logistics/conveyor/control",
            headers=headers,
            json={"command": "STOP"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["conveyor"]["is_running"])
        self.assertEqual(data["conveyor"]["speed_mps"], 0.0)

    def test_material_request_flow(self):
        """Verify that material dispatch requests deduct WMS stock and append a WES task."""
        headers = self.get_auth_headers()
        
        # 1. Fetch initial inventory count of Raw Castings
        inv_response = self.client.get("/api/v1/logistics/inventory", headers=headers)
        self.assertEqual(inv_response.status_code, 200)
        castings_stock = 0
        for item in inv_response.json():
            if item["item_name"] == "Raw Castings":
                castings_stock = item["quantity"]
                break
                
        self.assertTrue(castings_stock > 10)
            
        # 2. Request 10 Raw Castings
        req_response = self.client.post(
            "/api/v1/logistics/request",
            headers=headers,
            json={
                "material_type": "Raw Castings",
                "quantity": 10,
                "destination": "CNC Milling Alpha (Loading Station)",
                "priority": "HIGH"
            }
        )
        self.assertEqual(req_response.status_code, 200)
        req_data = req_response.json()
        self.assertEqual(req_data["status"], "success")
        task_id = req_data["task"]["id"]
        
        # 3. Confirm WMS inventory was decremented by 10
        inv_response2 = self.client.get("/api/v1/logistics/inventory", headers=headers)
        castings_stock2 = 0
        for item in inv_response2.json():
            if item["item_name"] == "Raw Castings":
                castings_stock2 = item["quantity"]
                break
        self.assertEqual(castings_stock2, castings_stock - 10)
        
        # 4. Confirm WES Task is marked IN_TRANSIT and exists in tasks list
        tasks_response = self.client.get("/api/v1/logistics/tasks", headers=headers)
        self.assertEqual(tasks_response.status_code, 200)
        matching_tasks = [t for t in tasks_response.json() if t["id"] == task_id]
        self.assertEqual(len(matching_tasks), 1)
        self.assertEqual(matching_tasks[0]["status"], "IN_TRANSIT")
        self.assertEqual(matching_tasks[0]["priority"], "HIGH")

if __name__ == "__main__":
    unittest.main()
