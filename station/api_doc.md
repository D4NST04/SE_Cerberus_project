# Funkcje API

## 1) Sprawdzenie kodu QR

### Endpoint
`POST /employee/check_qr`

### Request Headers:
```yaml
Content-Type  : application/json
Authorization : Bearer <token>  # jeśli jest
```

### Request Body:
```json
{
    "employee_id" : < numer pracownika >,
    "direction"   : < "IN" albo "OUT" >
}
```

### Response - pracownik istnieje
200 OK
```json
{
    "exists"      : true,
    "employee_id" : < numer pracownika >,
    "first_name"  : < imię pracownika >,
    "last_name"   : < nazwisko pracownika >
}
```

### Response - pracownik nie istnieje
200 OK
```json
{
    "exists"      : false,
    "employee_id" : < numer pracownika >
}
```

### Response - błąd
500 / 503
```json
{
    "error" : "database_error"
}
```

## 2) Sprawdzenie twarzy

### Endpoint
`POST /face/verify`

### Request Headers:
```yaml
Content-Type  : multipart/form-data
Authorization : Bearer <token>  # jeśli jest
```

### Request Body:
```json
{
    "employee_id" : < numer pracownika >,
    "direction"   : < "IN" albo "OUT" >,
    "photo:         : < plik .jpg >
}
```

### Response - dostęp przyznany / twarz niezgodna / brak uprawnień (Np OUT bez IN)
200 OK
```json
{
    "access_granted" : true / false / false
    "reason"         : "face_matched" / "face_mismatched" / "invalid_direction"
}
```

### Response - błąd
500 / 503
```json
{
    "error" : "face_service_unavailable"
}
```


## 3) Potwierdzenie wpuszczenia

### Endpoint
`POST /access/ack`

### Request Headers:
```yaml
Content-Type  : application/json
Authorization : Bearer <token>  # jeśli jest
```

### Request Body:
```json
{
    "employee_id" : < numer pracownika >,
    "direction"   : < "IN" albo "OUT" >,
    "timestamp"   : < data i godzina w formacie: "2001-09-11T08:46:44" >
}
```

### Response - sukces:
200 OK
```json
{
  "status": "acknowledged"
}
```

### Response - odrzucone
200 OK
```json
{
  "status": "rejected",
  "reason": "invalid_state"
}
```

### Response - błąd serwera
500 / 503
```json
{
  "error": "access_log_unavailable"
}
```
