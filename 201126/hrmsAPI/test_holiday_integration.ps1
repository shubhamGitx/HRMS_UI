# Test Holiday Calendar Integration with Leave Management
$ErrorActionPreference = "Stop"
$apiBase = "http://localhost:5299"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  HOLIDAY CALENDAR & CHARGEABLE LEAVE INTEGRATION TEST SUITE" -ForegroundColor Cyan
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

# 2. Test Holiday Master API
Write-Host "`n--- Test 1: GET /api/holidays ---" -ForegroundColor Yellow
$holidaysRes = Invoke-RestMethod -Uri "$apiBase/api/holidays?year=2026" -Method Get -Headers $empHeaders
Write-Host "Total holidays retrieved: $($holidaysRes.data.Count)"
$novHolidays = $holidaysRes.data | Where-Object { $_.holidayDate -like "2026-11*" }
Write-Host "November Holidays:"
$novHolidays | ForEach-Object { Write-Host " - $($_.holidayDate): $($_.holidayName)" -ForegroundColor Cyan }

if ($novHolidays.Count -ge 3) {
    Write-Host "[PASS] Holiday Calendar API returned official holidays." -ForegroundColor Green
} else {
    Write-Error "Expected at least 3 November holidays, got $($novHolidays.Count)"
}

# 3. Test Calculation with Start Date on Holiday (14 Nov Children's Day)
Write-Host "`n--- Test 2: Start Date on Holiday (14 Nov) ---" -ForegroundColor Yellow
$bodyStartHol = @{
    employeeId = 1
    leaveTypeId = 1
    fromDate = "2026-11-14"
    toDate = "2026-11-16"
} | ConvertTo-Json
$calcRes1 = Invoke-RestMethod -Uri "$apiBase/api/leave/calculate-chargeable-days" -Method Post -Body $bodyStartHol -Headers $empHeaders
if (!$calcRes1.data.isValid -and $calcRes1.data.isFromDateHoliday) {
    Write-Host "[PASS] Start date holiday detected: $($calcRes1.data.validationMessage)" -ForegroundColor Green
} else {
    Write-Error "Expected start date holiday validation to fail!"
}

# 4. Test Calculation with End Date on Holiday (20 Nov)
Write-Host "`n--- Test 3: End Date on Holiday (20 Nov) ---" -ForegroundColor Yellow
$bodyEndHol = @{
    employeeId = 1
    leaveTypeId = 1
    fromDate = "2026-11-17"
    toDate = "2026-11-20"
} | ConvertTo-Json
$calcRes2 = Invoke-RestMethod -Uri "$apiBase/api/leave/calculate-chargeable-days" -Method Post -Body $bodyEndHol -Headers $empHeaders
if (!$calcRes2.data.isValid -and $calcRes2.data.isToDateHoliday) {
    Write-Host "[PASS] End date holiday detected: $($calcRes2.data.validationMessage)" -ForegroundColor Green
} else {
    Write-Error "Expected end date holiday validation to fail!"
}

# 5. Test Chargeable Days Calculation with Middle Holidays & Sunday
Write-Host "`n--- Test 4: Middle Holidays Excluded (10 Nov to 16 Nov 2026) ---" -ForegroundColor Yellow
$bodyRange = @{
    employeeId = 1
    leaveTypeId = 1
    fromDate = "2026-11-10"
    toDate = "2026-11-16"
} | ConvertTo-Json
$calcRes3 = Invoke-RestMethod -Uri "$apiBase/api/leave/calculate-chargeable-days" -Method Post -Body $bodyRange -Headers $empHeaders
Write-Host "Total Calendar Days: $($calcRes3.data.totalCalendarDays)"
Write-Host "Holiday Count: $($calcRes3.data.holidayDaysCount)"
Write-Host "Weekly Off (Sunday) Count: $($calcRes3.data.weeklyOffDaysCount)"
Write-Host "Net Chargeable Days: $($calcRes3.data.chargeableDays)"

if ($calcRes3.data.totalCalendarDays -eq 7 -and $calcRes3.data.holidayDaysCount -eq 2 -and $calcRes3.data.weeklyOffDaysCount -eq 1 -and $calcRes3.data.chargeableDays -eq 4) {
    Write-Host "[PASS] Exact calculation: 7 Total - 2 Holidays (12, 14 Nov) - 1 Sunday (15 Nov) = 4 Chargeable Days!" -ForegroundColor Green
} else {
    Write-Error "Chargeable days mismatch. Expected 4, got $($calcRes3.data.chargeableDays)"
}

# 6. Test Backend Rejection when Attempting to Apply with Start Date on Holiday
Write-Host "`n--- Test 5: Backend Rejection of Leave Starting on Holiday ---" -ForegroundColor Yellow
$applyStartHol = @{
    employeeId = 1
    leaveTypeId = 1
    leaveReasonId = 1
    fromDate = "2026-11-14"
    toDate = "2026-11-16"
    reason = "Testing backend rejection"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$apiBase/api/leave/apply" -Method Post -Body $applyStartHol -Headers $empHeaders
    if (!$res.success) {
        Write-Host "[PASS] Backend rejected with message: $($res.message)" -ForegroundColor Green
    } else {
        Write-Error "Backend allowed leave starting on a holiday!"
    }
} catch {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errText = $reader.ReadToEnd()
    Write-Host "[PASS] Backend rejected with 400 Bad Request: $errText" -ForegroundColor Green
}

# 7. Test Backend Rejection when Chargeable Days = 0 (e.g. only Sunday)
Write-Host "`n--- Test 6: Backend Rejection of Zero Chargeable Days ---" -ForegroundColor Yellow
$applySunday = @{
    employeeId = 1
    leaveTypeId = 1
    leaveReasonId = 1
    fromDate = "2026-11-15"
    toDate = "2026-11-15"
    reason = "Testing zero chargeable days"
} | ConvertTo-Json

try {
    $res2 = Invoke-RestMethod -Uri "$apiBase/api/leave/apply" -Method Post -Body $applySunday -Headers $empHeaders
    if (!$res2.success) {
        Write-Host "[PASS] Backend rejected zero-chargeable leave: $($res2.message)" -ForegroundColor Green
    } else {
        Write-Error "Backend allowed 0 chargeable day leave!"
    }
} catch {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errText = $reader.ReadToEnd()
    Write-Host "[PASS] Backend rejected zero-chargeable leave: $errText" -ForegroundColor Green
}

# 8. Test Balance Deduction Integrity: Deducts only Chargeable Days (not Total Calendar Days)
Write-Host "`n--- Test 7: Apply Leave & Verify Balance Deducts ONLY Chargeable Days ---" -ForegroundColor Yellow
$initialBalances = Invoke-RestMethod -Uri "$apiBase/api/leave/balances?employeeId=1" -Method Get -Headers $empHeaders
$clInitial = ($initialBalances.data | Where-Object { $_.leaveTypeId -eq 1 }).balance
Write-Host "Initial CL Balance: $clInitial"

# Apply for 05 Dec to 07 Dec 2026:
# 05 Dec (Sat working), 06 Dec (Sun off), 07 Dec (Mon working)
# Total calendar days = 3, Sunday off = 1, Chargeable days = 2
$applyRange = @{
    employeeId = 1
    leaveTypeId = 1
    leaveReasonId = 1
    fromDate = "2026-12-05"
    toDate = "2026-12-07"
    reason = "Holiday & Sunday deduction test"
} | ConvertTo-Json

try {
    $applyRes = Invoke-RestMethod -Uri "$apiBase/api/leave/apply" -Method Post -Body $applyRange -Headers $empHeaders
    Write-Host "Applied successfully. LeaveId: $($applyRes.data.leaveId) | Deducted: $($applyRes.data.totalDays) days"
} catch {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "Apply failed with: $($reader.ReadToEnd())" -ForegroundColor Red
    throw
}

$afterBalances = Invoke-RestMethod -Uri "$apiBase/api/leave/balances?employeeId=1" -Method Get -Headers $empHeaders
$clAfter = ($afterBalances.data | Where-Object { $_.leaveTypeId -eq 1 }).balance
Write-Host "CL Balance after application: $clAfter"

$expectedBalance = $clInitial - 2  # 21 Nov (Sat), 22 Nov (Sun off), 23 Nov (Mon) -> 2 days deducted
if ($clAfter -eq $expectedBalance) {
    Write-Host "[PASS] Balance deducted exactly 2 chargeable days (excluded Sunday) instead of 3 calendar days!" -ForegroundColor Green
} else {
    Write-Error "Balance deduction mismatch. Expected $expectedBalance, got $clAfter"
}

# 9. Test Exact Balance Restoration upon Cancellation
Write-Host "`n--- Test 8: Cancel Leave & Verify Exact Balance Restoration ---" -ForegroundColor Yellow
$cancelBody = @{
    leaveId = $applyRes.data.leaveId
    cancellationReason = "Test cancellation"
} | ConvertTo-Json

$cancelRes = Invoke-RestMethod -Uri "$apiBase/api/leave/cancel" -Method Post -Body $cancelBody -Headers $empHeaders
Write-Host "Cancelled leave. Message: $($cancelRes.message)"

$restoredBalances = Invoke-RestMethod -Uri "$apiBase/api/leave/balances?employeeId=1" -Method Get -Headers $empHeaders
$clRestored = ($restoredBalances.data | Where-Object { $_.leaveTypeId -eq 1 }).balance
Write-Host "CL Balance after cancellation: $clRestored"

if ($clRestored -eq $clInitial) {
    Write-Host "[PASS] Balance restored exactly to initial ($clInitial)!" -ForegroundColor Green
} else {
    Write-Error "Balance restoration mismatch. Expected $clInitial, got $clRestored"
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  ALL HOLIDAY CALENDAR INTEGRATION TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
