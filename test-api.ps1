$response = Invoke-WebRequest -Uri "https://smartbiz-sl-oy4l.onrender.com/api/auth/login" -Method Post -Body '{"email":"test@test.com","password":"test"}' -ContentType "application/json" -ErrorAction SilentlyContinue
Write-Host "Status Code:" $response.StatusCode
Write-Host "Content:" $response.Content
