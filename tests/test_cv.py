import os
import sys
import unittest

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from computer_vision.generate_demo_images import generate_demo_parts, DEMO_DIR
from computer_vision.inspector import QualityInspector

class TestCVQualityInspection(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Generate demo parts if missing
        generate_demo_parts()
        cls.inspector = QualityInspector()

    def test_healthy_part_inspection(self):
        img_path = os.path.join(DEMO_DIR, "healthy_part.png")
        self.assertTrue(os.path.exists(img_path))
        
        res = self.inspector.inspect_image(img_path)
        self.assertEqual(res["status"], "PASS")
        self.assertEqual(res["defect_type"], "NONE")
        self.assertGreaterEqual(res["confidence_score"], 0.90)

    def test_label_missing_inspection(self):
        img_path = os.path.join(DEMO_DIR, "label_missing.png")
        self.assertTrue(os.path.exists(img_path))
        
        res = self.inspector.inspect_image(img_path)
        self.assertEqual(res["status"], "FAIL")
        self.assertEqual(res["defect_type"], "LABEL_MISSING")

    def test_surface_crack_inspection(self):
        img_path = os.path.join(DEMO_DIR, "surface_crack.png")
        self.assertTrue(os.path.exists(img_path))
        
        res = self.inspector.inspect_image(img_path)
        self.assertEqual(res["status"], "FAIL")
        self.assertEqual(res["defect_type"], "SURFACE_CRACK")

    def test_wrong_color_inspection(self):
        img_path = os.path.join(DEMO_DIR, "wrong_color.png")
        self.assertTrue(os.path.exists(img_path))
        
        res = self.inspector.inspect_image(img_path)
        self.assertEqual(res["status"], "FAIL")
        self.assertEqual(res["defect_type"], "WRONG_COLOR")

    def test_wrong_dimension_inspection(self):
        img_path = os.path.join(DEMO_DIR, "wrong_dimension.png")
        self.assertTrue(os.path.exists(img_path))
        
        res = self.inspector.inspect_image(img_path)
        self.assertEqual(res["status"], "FAIL")
        self.assertEqual(res["defect_type"], "WRONG_DIMENSION")

if __name__ == "__main__":
    unittest.main()
