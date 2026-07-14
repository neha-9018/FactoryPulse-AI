import os
import numpy as np
import cv2

DEMO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets", "demo_images")
os.makedirs(DEMO_DIR, exist_ok=True)

def generate_demo_parts():
    """Programmatically draws five mechanical part images using OpenCV to simulate shop floor items."""
    print("Generating mock shop-floor parts for CV inspection testing...")
    
    # Base configuration
    h, w = 300, 400
    grey_color = (150, 150, 150)
    red_color = (40, 40, 200) # BGR order in OpenCV
    label_text = "SN-MEIDEN-98"
    
    # 1. Healthy Part: Nominal grey block, centered label, correct width (200px)
    img_healthy = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.rectangle(img_healthy, (100, 50), (300, 250), grey_color, -1)
    cv2.putText(img_healthy, label_text, (130, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.imwrite(os.path.join(DEMO_DIR, "healthy_part.png"), img_healthy)
    print("✓ Saved healthy_part.png")
    
    # 2. Label Missing: Same grey block, but no serial label text
    img_no_label = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.rectangle(img_no_label, (100, 50), (300, 250), grey_color, -1)
    cv2.imwrite(os.path.join(DEMO_DIR, "label_missing.png"), img_no_label)
    print("✓ Saved label_missing.png")
    
    # 3. Surface Crack: Same block, but thin black jagged lines represent micro-cracks
    img_crack = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.rectangle(img_crack, (100, 50), (300, 250), grey_color, -1)
    cv2.putText(img_crack, label_text, (130, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    # Draw jagged black cracks
    cv2.line(img_crack, (120, 80), (140, 110), (0, 0, 0), 2)
    cv2.line(img_crack, (140, 110), (135, 140), (0, 0, 0), 2)
    cv2.line(img_crack, (220, 180), (250, 210), (0, 0, 0), 2)
    cv2.imwrite(os.path.join(DEMO_DIR, "surface_crack.png"), img_crack)
    print("✓ Saved surface_crack.png")
    
    # 4. Wrong Color: Block drawn in bright red instead of standard grey
    img_color = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.rectangle(img_color, (100, 50), (300, 250), red_color, -1)
    cv2.putText(img_color, label_text, (130, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.imwrite(os.path.join(DEMO_DIR, "wrong_color.png"), img_color)
    print("✓ Saved wrong_color.png")
    
    # 5. Wrong Dimension: Block drawn with double the width (300px instead of 200px)
    img_dim = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.rectangle(img_dim, (50, 50), (350, 250), grey_color, -1)
    cv2.putText(img_dim, label_text, (130, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.imwrite(os.path.join(DEMO_DIR, "wrong_dimension.png"), img_dim)
    print("✓ Saved wrong_dimension.png")
    
    print("[SUCCESS] All mock parts generated in datasets/demo_images/")

if __name__ == "__main__":
    generate_demo_parts()
