from os import getenv
from datetime import datetime
import requests
import cv2
from station_secrets import sweet_secrets


class Contact_API:
    def __init__( self ):
        self.qr_url = sweet_secrets[ "qr_url" ]
        self.face_url = sweet_secrets[ "face_url" ]
        self.ack_url = sweet_secrets[ "ack_url" ]
        self.token = sweet_secrets[ "auth_token" ]

        self.direction = getenv( "STATION_DIRECTION" )

        print( f'Station direction is: {self.direction}' )

        self.timeout = 5

        self.mock_good_qr = {
            "exists"      : True,
            "employee_id" : "213769420",
            "first_name"  : "Zbigniew",
            "last_name"   : "Stonoga"
        }

        self.mock_bad_qr = {
            "exists" : False,
            "employee_id" : "213769420"
        }

    def _headers( self ):
        if self.token:
            return {
                "Authorization": f"Bearer {self.token}"
            }
        return {}

    def check_qr( self, qr_code : str ):

        return self.mock_good_qr

        try:
            payload = {
                "employee_id" : qr_code,
                "direction"   : self.direction
            }

            response = requests.get(
                self.qr_url,
                headers = self._headers(),
                json = payload,
                timeout = self.timeout
            )
            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            print( f"[API] check_qr error: {e}" )
            return None

    def check_face( self, frame, employee_id ):
        try:
            ok, buf = cv2.imencode( ".jpg", frame )
            if not ok:
                return None

            file = { "photo" : ( "frame.jpg", buf.tobytes(), "image/jpeg") }
            data = {
                "employee_id" : employee_id,
                "direction"   : self.direction
            }

            response = requests.post(
                self.face_url,
                headers = self._headers(),
                files = file,
                data = data,
                timeout = self.timeout
            )

            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            print( f"[API] check_face error: {e}")
            return None

    def acknowledge_decision( self, employee_id, allowed ):

        try:
            payload = {
                "employee_id" : employee_id,
                "direction"   : self.direction,
                "timestamp"   : datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            }

            response = requests.post(
                self.ack_url,
                headers = self._headers(),
                json = payload,
                timeout = self.timeout
            )

            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            print( f"[API] acknowledge_decision error: {e}" )
            return None


