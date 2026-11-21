import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { EmployeeApiService } from '@core/services/employee-api.service';
import { LanguageService } from '@core/i18n/language.service';

@Component({
  selector: 'app-employee-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-header.html',
  styleUrl: './employee-header.css'
})
export class EmployeeHeader implements OnInit {
  private readonly authSession = inject(AuthSessionService);
  private readonly employeeApi = inject(EmployeeApiService);
  public readonly language = inject(LanguageService);

  employeeName = 'Sudha Kumari';
  employeeCode = 'BRDS-EMP-000001';
  designation = 'Contractual Employee';
  department = 'Bihar Rural Development Society';
  office = 'BRDS Headquarters';
  employeeType = 'Contractual';
  reportingOfficer = '';
  reportingRole = '';
  status = 'Active';

  ngOnInit(): void {
    const user = this.authSession.user;
    if (user?.userName) {
      this.employeeName = user.userName;
    }
    if (user?.employeeId) {
      this.employeeCode = `EMP${user.employeeId}`;
    } else if (user?.userId) {
      this.employeeCode = user.userId;
    }
    if (user?.reportingOfficialName) {
      this.reportingOfficer = user.reportingOfficialName;
    }

    // Attempt to load full profile if employeeId exists
    const empId = user?.employeeId;
    if (empId) {
      this.employeeApi.getPersonalDetails(Number(empId)).subscribe({
        next: res => {
          if (res?.data) {
            const p = res.data;
            const details = p.personalDetails;
            if (details) {
              if (details.employeeName) this.employeeName = details.employeeName;
              if (details.designationName) this.designation = details.designationName;
              if (details.officeName) this.office = details.officeName;
              if (details.employeeTypeName) this.employeeType = details.employeeTypeName;
              if (details.reportingOfficialName) this.reportingOfficer = details.reportingOfficialName;
            }
            if (p.contractNo) this.employeeCode = p.contractNo;
            if (p.recordStatus) this.status = p.recordStatus === 'ACTIVE' ? 'Active' : p.recordStatus;
          }
        },
        error: () => {
          // Keep defaults gracefully if API unavailable
        }
      });
    }
  }

  get initials(): string {
    return this.employeeName
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
