import threading
import time

from camera import CameraControl
from api import Contact_API

class Controller:
    def __init__( self, root, gui ):
        self.root = root
        self.gui = gui

        self.api = Contact_API()
        # Camera initialization
        self.camera = CameraControl( callback_qr=None )
        self.FPS = 30
        self.running = True
        self.busy = False

        # start main loop in the background
        threading.Thread( target=self.loop, daemon=True).start()

        self.qr_handling = False

    def loop( self ):
        while self.running:
            if self.busy:
                time.sleep( 0.05 )
                continue

            frame = self.camera.read_frame()
            if frame is None:
                continue

            # --- update preview in GUI ---
            self.root.after(
                0, lambda f=frame: self.gui.set_camera_image( f )
            )

            # --- qr handling ---
            if not self.qr_handling:
                self.handle_qr( frame )

            time.sleep( 1 / self.FPS )

    def handle_qr( self, frame ):
        qr_code = self.camera.detect_qr( frame )
        if not qr_code:
            return

        self.qr_handling = True

        self.root.after(
            0,
            lambda q=qr_code: self.gui.set_status(
                f"Pracownik nr {q}: Pobieram dane..."
            )
        )

        data = self.api.check_qr( qr_code )

        if not data:
            self.root.after(
                0,
                lambda: self.gui.set_info( "Błąd API" )
            )
            self.qr_handling = False
            return



        name = f"{data.get('first_name', '')} {data.get('last_name', '')}"

        self.root.after(
            0,
            lambda: self.gui.set_status(
                f"Pracownik nr {qr_code}: {name}"
            )
        )




    def stop( self ):
        self.running = False
        self.camera.release()
