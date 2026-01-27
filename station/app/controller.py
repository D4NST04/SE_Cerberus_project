import threading
import time

from camera import CameraControl
from api import Contact_API

class Controller:
    def __init__(self, root, gui):
        self.root = root
        self.gui = gui
        self.api = Contact_API()
        self.camera = CameraControl( callback_qr=None )

        self.FPS = 30
        self.running = True
        self.is_busy = False # Jedna flaga wystarczy, by wiedzieć czy stacja "pracuje"

        self.current_frame = None

        threading.Thread(target=self.loop, daemon=True).start()

    def loop(self):
        """Pętla kamery - zajmuje się tylko wyświetlaniem obrazu i czekaniem na QR."""
        while self.running:
            frame = self.camera.read_frame()
            if frame is None: continue

            self.current_frame = frame

            # Podgląd w GUI
            self.root.after(0, lambda f=frame: self.gui.set_camera_image(f))

            # Jeśli stacja nie przetwarza teraz nikogo, szukaj QR
            if not self.is_busy:
                qr_code = self.camera.detect_qr(frame)
                if qr_code:
                    self.is_busy = True # Blokujemy stację
                    threading.Thread(target=self.full_verification_procedure, args=(qr_code,), daemon=True).start()

            time.sleep(1 / self.FPS)

    # --- GLÓWNE FLOW (DYRYGENT) ---
    def full_verification_procedure(self, qr_code):
        """Ta funkcja pilnuje kolejności kroków."""
        try:
            # 1. Sprawdź QR
            employee_name = self.process_qr_logic(qr_code)
            if not employee_name:
                return # Błąd obsłużony wewnątrz funkcji

            # 2. Odliczanie i Twarz
            face_result = self.handle_face_recognition(qr_code)
            if not face_result:
                return # Błąd lub brak zgody

            # 3. Sukces końcowy
            self.gui_update_info("DOSTĘP PRZYZNANY", color="green")
            time.sleep(3) # Daj czas na przeczytanie

        finally:
            # Zawsze czyścimy stan na końcu, by móc obsłużyć kolejną osobę
            self.reset_station()

    # --- KROKI PROCEDURY ---
    def process_qr_logic(self, qr_code):
        self.gui_update_info(f"Sprawdzam pracownika {qr_code}...")
        try:
            qr_code = int( qr_code )


            data = self.api.check_qr(qr_code)

            if data is None:
                self.gui_update_info("Błąd połączenia z serwerem", color="orange")
                time.sleep(2)
                return None

            if not data.get("exists"):
                self.gui_update_info("PRACOWNIK NIEZNANY", color="red")
                # Logowanie incydentu (zdjęcie nieznajomego)
                self.api.check_face(self.camera.read_frame(), employee_id=0)
                time.sleep(2)
                return None

            name = f"{data.get('first_name')} {data.get('last_name')}"
            self.root.after(0, lambda: self.gui.set_status(f"Witaj {name}"))
            return name

        except ValueError:
            self.root.after(
                0,
                lambda: self.gui.set_info( "Błędny kod QR" )
            )
            return None

    def handle_face_recognition(self, qr_code):
        """Odlicza i robi zdjęcie."""
        for i in range(3, 0, -1):
            self.gui_update_info(f"Zdjęcie twarzy za {i}s")
            time.sleep(1)

        self.gui_update_info("Weryfikacja twarzy...")

        data = self.api.check_face( self.current_frame, qr_code)

        print( data )

        if data is None:
            self.gui_update_info("Błąd serwera twarzy", color="orange")
            return False

        if not data.get("access_granted"):
            reason = data.get("reason", "unknown")
            msg = "ODMOWA: Twarz niezgodna" if reason == "face_mismatched" else "BŁĄD KIERUNKU"
            self.gui_update_info(msg, color="red")
            time.sleep(3)
            return False

        return True

    # --- POMOCNIKI ---
    def gui_update_info(self, text, color="default"):
        """Pomocnik do szybkich zmian w GUI."""
        self.root.after(0, lambda: self.gui.set_info(text))
        # Tutaj możesz dodać zmianę koloru tła w gui.set_bg(color)

    def reset_station(self):
        """Przywraca stację do stanu gotowości."""
        self.root.after(0, lambda: self.gui.set_status("Czekam na kod QR..."))
        self.root.after(0, lambda: self.gui.set_info(""))
        self.is_busy = False

    def stop(self):
        self.running = False
        self.camera.release()
