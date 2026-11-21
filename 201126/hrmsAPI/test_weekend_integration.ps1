# Test Updated Holiday & Weekend (Saturday + Sunday) Integration
$ErrorActionPreference = "Stop"
$apiBase = "http://localhost:5299"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  WEEKEND (SAT & SUN) & LEAVE DAYS INTEGRATION TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Authenticate Employee
$empLoginBody = @{ userId = "EMP001"; password = "Admin@123"; userRole = 0; langCode = 1 } | ConvertTo-Json
$otpRes = Invoke-RestMethod -Uri "$apiBase/api/login/request-otp" -Method Post -ContentType "application/json" -Body $empLoginBody
$otp = $otpRes.data.developmentOtp
$verifyBody = @{ userId = "EMP001"; otp = $otp; otpType = 0; userRole = 0; langCode = 1 } | ConvertTo-Json
$empLoginRes = Invoke-RestMethod -Uri "$apiBase/api/login/verify-otp" -Method Post -ContentType "application/json" -Body $verifyBody
$empToken = $empLoginRes.data.accessToken
$empHeaders = @{ Authorization = "Bearer $empToken"; "Content-Type" = "application/json" }
Write-Host "[PASS] Employee authenticated successfully." -ForegroundColor Green

# 2. Test 12 Nov is now a normal working day (not blocked!)
Write-Host "`n--- Test 1: 12 Nov 2026 is a normal working day ---" -ForegroundColor Yellow
$body12Nov = @{
    employeeId = 1
    leaveTypeId = 1
    fromDate = "2026-11-12"
    toDate = "2026-11-12"
} | ConvertTo-Json
$calc12Nov = Invoke-RestMethod -Uri "$apiBase/api/leave/calculate-chargeable-days" -Method Post -Body $body12Nov -Headers $empHeaders
if ($calc12Nov.data.isValid -and $calc12Nov.data.chargeableDays -eq 1) {
    Write-Host "[PASS] 12 Nov 2026 (Thursday) is recognized as a valid working day (1 Leave Day)." -ForegroundColor Green
} else {
    Write-Error "12 Nov 2026 should be a valid working day!"
}

# 3. Test Saturday Single Day (21 Nov 2026) -> Blocked as Weekend
Write-Host "`n--- Test 2: Saturday (21 Nov 2026) Blocked as Weekend ---" -ForegroundColor Yellow
$bodySat = @{
    employeeId = 1
    leaveTypeId = 1
    fromDate = "2026-11-21"
    toDate = "2026-11-21"
} | ConvertTo-Json
$calcSat = Invoke-RestMethod -Uri "$apiBase/api/leave/calculate-chargeable-days" -Method Post -Body $bodySat -Headers $empHeaders
Write-Host "IsValid: $($calcSat.data.isValid) | Message: $($calcSat.data.validationMessage)"
if (!$calcSat.data.isValid -and $calcSat.data.isFromDateWeekend) {
    Write-Host "[PASS] Saturday correctly blocked as weekend: $($calcSat.data.validationMessage)" -ForegroundColor Green
} else {
    Write-Error "Expected Saturday to be blocked as weekend!"
}

# 4. Test Sunday Single Day (22 Nov 2026) -> Blocked as Weekend
Write-Host "`n--- Test 3: Sunday (22 Nov 2026) Blocked as Weekend ---" -ForegroundColor Yellow
$bodySun = @{
    employeeId = 1
    leaveTypeId = 1
    fromDate = "2026-11-22"
    toDate = "2026-11-22"
} | ConvertTo-Json
$calcSun = Invoke-RestMethod -Uri "$apiBase/api/leave/calculate-chargeable-days" -Method Post -Body $bodySun -Headers $empHeaders
Write-Host "IsValid: $($calcSun.data.isValid) | Message: $($calcSun.data.validationMessage)"
if (!$calcSun.data.isValid -and $calcSun.data.isFromDateWeekend) {
    Write-Host "[PASS] Sunday correctly blocked as weekend: $($calcSun.data.validationMessage)" -ForegroundColor Green
} else {
    Write-Error "Expected Sunday to be blocked as weekend!"
}

# 5. Test Friday to Monday Range (20 Nov to 23 Nov 2026)
# 20 Nov (Fri working), 21 Nov (Sat off), 22 Nov (Sun off), 23 Nov (Mon working)
# Total calendar days = 4, Weekend offs = 2, Leave days = 2
Write-Host "`n--- Test 4: Friday to Monday Range with Saturday & Sunday Excluded ---" -ForegroundColor Yellow
$bodyFriMon = @{
    employeeId = 1
    leaveTypeId = 1
    fromDate = "2026-11-20"
    toDate = "2026-11-23"
} | ConvertTo-Json
$calcFriMon = Invoke-RestMethod -Uri "$apiBase/api/leave/calculate-chargeable-days" -Method Post -Body $bodyFriMon -Headers $empHeaders
Write-Host "Total Calendar Days: $($calcFriMon.data.totalCalendarDays)"
Write-Host "Weekend Offs (Sat & Sun): $($calcFriMon.data.weeklyOffDaysCount)"
Write-Host "Leave Days to Deduct: $($calcFriMon.data.chargeableDays)"
if ($calcFriMon.data.totalCalendarDays -eq 4 -and $calcFriMon.data.weeklyOffDaysCount -eq 2 -and $calcFriMon.data.chargeableDays -eq 2) {
    Write-Host "[PASS] Exactly 2 Leave Days calculated (excluded both Saturday and Sunday)!" -ForegroundColor Green
} else {
    Write-Error "Expected 2 leave days and 2 weekend offs!"
}

# 6. Test Single Day Holiday (14 Nov Children's Day)
Write-Host "`n--- Test 5: Single Day Holiday Consolidated Error ---" -ForegroundColor Yellow
$bodyHol = @{
    employeeId = 1
    leaveTypeId = 1
    fromDate = "2026-11-14"
    toDate = "2026-11-14"
} | ConvertTo-Json
$calcHol = Invoke-RestMethod -Uri "$apiBase/api/leave/calculate-chargeable-days" -Method Post -Body $bodyHol -Headers $empHeaders
Write-Host "IsValid: $($calcHol.data.isValid) | Message: $($calcHol.data.validationMessage)"
if (!$calcHol.data.isValid -and $calcHol.data.isFromDateHoliday -and $calcHol.data.isToDateHoliday) {
    Write-Host "[PASS] Single day holiday properly flagged: $($calcHol.data.validationMessage)" -ForegroundColor Green
} else {
    Write-Error "Expected 14 Nov to be recognized as holiday!"
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  ALL TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
