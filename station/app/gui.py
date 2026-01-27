import tkinter as tk
import tkinter.ttk as ttk
from PIL import Image, ImageTk
import cv2

class MainWindow:
    def __init__(self, root):
        self.root = root
        # Closing app with Q or q
        root.bind("<KeyPress-q>", lambda e: self.close())
        root.bind("<KeyPress-Q>", lambda e: self.close())

        self.all_labels = {
            "wait_qr": "Czekam na kod QR pracownika...",
            "wait_api": "Czekam na dane pracownika nr.{qr}",
            "api_ans": "Pracownik nr.{qr}: {name}",
            "show_qr": "Pokaż kod QR do kamery",
            "show_face": "Pokaż twarz do kamery",
            "ok": "Weryfikacja pozytywna",
            "fail": "Weryfikacja negatywna"
        }

        self.root = root
        self.root.title("Cerberus station - rozpoznawanie pracownika")

        self.main_frame = ttk.Frame(self.root, padding=6)
        self.main_frame.grid(row=0, column=0, sticky="nsew")

        # ───────── status ─────────
        self.status_label = ttk.Label(
            self.main_frame,
            text=self.all_labels["wait_qr"],
            font=("Arial", 16)
        )
        self.status_label.grid(row=0, column=0, pady=5, sticky="ew")

        # ───────── camera ─────────
        self.camera_label = ttk.Label(self.main_frame)
        self.camera_label.grid(row=1, column=0, sticky="nsew")


# wczytanie przykładowego JPEG
        placeholder_path = "/app/shrek.jpg"  # podmień na swój plik
        try:
            img = Image.open(placeholder_path)
            img = img.resize((640, 480))  # opcjonalne skalowanie
            self.camera_imgtk = ImageTk.PhotoImage(img)
            self.camera_label.config(image=self.camera_imgtk)
        except Exception as e:
            print("Błąd wczytywania placeholdera:", e)


        # ───────── info ─────────
        self.information_label = ttk.Label(
            self.main_frame,
            text=self.all_labels["show_qr"],
            font=("Arial", 16)
        )
        self.information_label.grid(row=2, column=0, pady=5, sticky="ew")

        # ───────── grid ─────────
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        self.main_frame.columnconfigure(0, weight=1)
        self.main_frame.rowconfigure(1, weight=1)

    # ───────── setters ─────────
    def set_status(self, text):
        self.status_label.config(text=text)

    def set_info(self, text):
        self.information_label.config(text=text)

    def set_camera_image(self, frame):
        if frame is None:
            return

        frame = cv2.flip( frame, 1 )

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = ImageTk.PhotoImage(Image.fromarray(rgb))
        self.camera_label.imgtk = img
        self.camera_label.config(image=img)

    def close(self):
        try:
            if hasattr(self, "camera") and self.camera:
                self.camera.release()  # jeśli masz kamerę
        except Exception:
            pass
        self.root.destroy()

