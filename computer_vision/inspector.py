import os
import cv2
import numpy as np

class QualityInspector:
    def __init__(self):
        pass

    def inspect_image(self, image_path: str, output_path: str = None):
        """Analyzes an image using OpenCV and detects label absence, cracks, wrong size, or wrong color."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at {image_path}")

        # 1. Read image
        img = cv2.imread(image_path)
        h, w, c = img.shape
        
        # Output info variables
        defect_type = "NONE"
        status = "PASS"
        confidence = 0.985
        annotated_img = img.copy()

        # 2. Check for WRONG COLOR (Convert to HSV and scan for red hues)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        # Red ranges in HSV
        lower_red1 = np.array([0, 70, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 70, 50])
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = mask1 + mask2
        
        red_ratio = np.sum(red_mask > 0) / (h * w)
        if red_ratio > 0.05: # if more than 5% of image is red
            defect_type = "WRONG_COLOR"
            status = "FAIL"
            confidence = 0.992
            # Draw overlay rectangle
            cv2.rectangle(annotated_img, (5, 5), (w - 5, h - 5), (0, 0, 255), 3)
            cv2.putText(annotated_img, "ERR: WRONG COLOR", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            
            if output_path:
                cv2.imwrite(output_path, annotated_img)
            return {"status": status, "defect_type": defect_type, "confidence_score": confidence}

        # 3. Find block external contours to assess dimensions and placement
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return {"status": "FAIL", "defect_type": "DAMAGE", "confidence_score": 0.95}
            
        # Get largest contour corresponding to the block part
        block_contour = max(contours, key=cv2.contourArea)
        x_box, y_box, w_box, h_box = cv2.boundingRect(block_contour)
        
        # Check WRONG DIMENSIONS (Nominal width is 200px, warning boundary is > 250px)
        if w_box > 250:
            defect_type = "WRONG_DIMENSION"
            status = "FAIL"
            confidence = 0.995
            cv2.rectangle(annotated_img, (x_box, y_box), (x_box + w_box, y_box + h_box), (0, 0, 255), 2)
            cv2.putText(annotated_img, f"ERR: OVERSIZE ({w_box}px)", (x_box, y_box - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
            if output_path:
                cv2.imwrite(output_path, annotated_img)
            return {"status": status, "defect_type": defect_type, "confidence_score": confidence}

        # 4. Check for LABEL MISSING (Crop central label region SN-MEIDEN-98)
        # Nominal block lies between X[100, 300], Y[50, 250]. Label is centered around Y[135, 165]
        label_crop = gray[135:165, 120:280]
        label_std = np.std(label_crop)
        
        if label_std < 5.0: # Very low contrast variance means no text characters present
            defect_type = "LABEL_MISSING"
            status = "FAIL"
            confidence = 0.978
            cv2.rectangle(annotated_img, (120, 135), (280, 165), (0, 0, 255), 2)
            cv2.putText(annotated_img, "ERR: LABEL MISSING", (100, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
            if output_path:
                cv2.imwrite(output_path, annotated_img)
            return {"status": status, "defect_type": defect_type, "confidence_score": confidence}

        # 5. Check for SURFACE CRACKS (Run Canny edge detection on block face face region)
        # We crop the face of the block excluding outer borders (X[110, 290], Y[60, 240]) and the text label region
        block_face = gray[60:240, 110:290]
        edges = cv2.Canny(block_face, 50, 150)
        
        # Zero out the text label region in the edge mask to prevent text lines from being flagged as cracks
        # The cropped region coordinates translate: label Y is [135-60 : 165-60] = [75:105], label X is [120-110 : 280-110] = [10:170]
        edges[75:105, 10:170] = 0
        
        edge_pixel_count = np.sum(edges > 0)
        if edge_pixel_count > 40: # high edge density indicates jagged cracks or lines on face
            defect_type = "SURFACE_CRACK"
            status = "FAIL"
            confidence = 0.965
            
            # Map edge locations back to draw red highlighting on output image
            y_indices, x_indices = np.where(edges > 0)
            for y_idx, x_idx in zip(y_indices, x_indices):
                cv2.circle(annotated_img, (x_idx + 110, y_idx + 60), 2, (0, 0, 255), -1)
                
            cv2.putText(annotated_img, "ERR: SURFACE CRACK", (100, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
            if output_path:
                cv2.imwrite(output_path, annotated_img)
            return {"status": status, "defect_type": defect_type, "confidence_score": confidence}

        # If healthy, draw green box and return PASS
        cv2.rectangle(annotated_img, (x_box, y_box), (x_box + w_box, y_box + h_box), (0, 255, 0), 2)
        cv2.putText(annotated_img, "OK - PASS", (x_box, y_box - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        if output_path:
            cv2.imwrite(output_path, annotated_img)
        return {"status": status, "defect_type": defect_type, "confidence_score": confidence}
