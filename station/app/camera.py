import cv2
from pyzbar import pyzbar

class CameraControl:
    def __init__( self, callback_qr ):
        self.cam = cv2.VideoCapture( 0 )

    def read_frame( self ):
        ok, frame = self.cam.read()
        if not ok:
            return None
        return self.crop_to_square( frame )

    def detect_qr( self, frame ):
        codes = pyzbar.decode( frame )
        if not codes:
            return None
        return codes[0].data.decode( "utf-8" )

    def take_photo( self ):
        return self.read_frame()

    def release( self ):
        self.cam.release()

    def crop_to_square( self, frame ):
        h, w = frame.shape[ :2 ]
        size = min( h, w )

        x_start = ( w - size ) // 2
        y_start = ( h - size ) // 2

        return frame[ y_start:y_start+size, x_start:x_start+size ]
