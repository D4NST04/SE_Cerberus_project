# SE_Cerberus_project  

## Here begins the act of creation — one line of code at a time.

For here we are.  
We, the unwilling led by the unknowing, are doing the impossible for the ungrateful.  
We have done so much for so long with so little,  
we are now qualified to do anything with nothing.

### Test curls for backend

- health check

```sh
curl -i http://localhost:8080/health
```

- Create a new employee:

```sh
 curl -X POST http://localhost:8080/api/employees \
   -H "Content-Type: application/json" \
   -d '{
     "first_name": "John",
     "last_name": "Doe",
     "role": "employee",
     "login": "jdoe",
     "date_of_termination": null
   }'
```

- list employees:

```sh
curl http://localhost:8080/api/employees
``````

- delete employee

```sh
curl -X DELETE http://localhost:8080/api/employees/<ID>
```

- employee set/update face

```sh
curl -X POST http://localhost:8080/api/employees/<ID>/photo \
  -F "photo=@/path/to/your/image.jpg"
```

- verify face

```sh
curl -X POST http://localhost:8080/api/face/verify \
  -F "employee_id=<ID>" \
  -F "direction=IN" \
  -F "photo=@/path/to/verify_image.jpg"
```

- check qr code

```sh
curl -X POST http://localhost:8080/api/employee/check_qr \
  -H "Content-Type: application/json" \
  -d '{"employee_id": <ID>, "direction": "IN"}'
```

-  view access logs

```sh
curl http://localhost:8080/api/access_logs
```
