beginning = "http://127.0.0.1:8080"

sweet_secrets = {
    "qr_url" : beginning + "/api/employee/check_qr",
    "face_url" : beginning + "/api/face/verify",
    "ack_url" : beginning + "/api/access/ack",
    "auth_token" : None  # "Here put token if API needs it"
}
