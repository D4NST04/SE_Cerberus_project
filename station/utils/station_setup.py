from pathlib import Path

from detect_cameras import detect_cameras

template_path = Path( __file__ ).resolve().parent / "template_compose.yaml"
destination_file = Path( __file__ ).resolve().parent.parent / "docker-compose.yaml"

template_file = template_path.read_text()

what_to_add = [
    True,   # this is for adding camera
    False,  # this is for adding ssh
]

if what_to_add[0]:
    camera = detect_cameras()
    device_path = f"/dev/video{camera['index']}"

    new_compose = template_file.replace( "{device_choosen}", device_path )


if new_compose:
    destination_file.write_text( new_compose )
    print( 'Generated docker-compose.yaml' )
