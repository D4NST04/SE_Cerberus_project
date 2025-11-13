import cv2
import os

MAX_TEST_INDEX = 10

def test_camera( idx ):
    cap = cv2.VideoCapture( idx )

    if not cap.isOpened():
        return None

    ret, frame = cap.read()
    if not ret or frame is None:
        cap.release()
        return None

    h, w = frame.shape[ :2 ]

    dev_path = f"/sys/class/video4linux/video{idx}/name"
    if os.path.exists( dev_path ):
        with open( dev_path, "r" ) as f:
            name = f.read().strip()
    else:
        name = "Unknown camera"

    cap.release()

    return { "index" : idx,
             "name"  : name,
             "width" : w,
             "height": h}

def detect_cams():
    cams = []
    print( f'Scanning for available cameras (0-{MAX_TEST_INDEX}): ' )

    for i in range( MAX_TEST_INDEX+1 ):
        info = test_camera( i )
        if info:
            print( f"\t[{i}] {info["name"]} ({ info['width'] }x{ info['height'] })" )
            cams.append( info )

    if not cams:
        print( "Could not find any cameras")

    return cams

def choose_cam( cameras ):
    print( 'Choose number of camera you would like to use: ', end="" )
    choice = input()
    try:
        idx = int( choice )
    except ValueError:
        print( 'Incorrect number' )
        choose_cam( cameras )
    for cam in cameras:
        if cam['index'] == idx:
            return cam
    print( 'Could not find choosen camera' )
    return None

def main():
    cams = detect_cams()
    if not cams:
        return

    cam = choose_cam( cams )
    if cam:
        print( '\nYou have choosen cam: ')
        print( cam )


if __name__ == "__main__":
    main()
