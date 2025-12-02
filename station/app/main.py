import cv2

def main():
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Could not open camera")
        return

    qr_detector = cv2.QRCodeDetector()

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Could not read the frame")
            break

        height, width = frame.shape[:2]

        # Default red frame
        frame_color = (0, 0, 255)

        # QR Recognition
        data, points, _ = qr_detector.detectAndDecode(frame)

        if points is not None:
            pts = points[0].astype(int)
            for i in range(len(pts)):
                cv2.line(frame, tuple(pts[i]), tuple(pts[(i+1) % len(pts)]), (0,255,0), 3)

            if data:
                # If QR read successfully then change frame color to green
                frame_color = (0, 255, 0)

                cv2.putText(frame, f"QR: {data}", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

        # Make that frame
        cv2.rectangle(frame, (0, 0), (width-1, height-1), frame_color, 3)

        cv2.imshow("Camera", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
