using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HRMSAPI.MODEL.Login;
using Microsoft.IdentityModel.Tokens;

namespace HRMSAPI.BAL.Login;

public sealed class JwtService(IConfiguration configuration) : IJwtService
{
    public (string Token, DateTimeOffset ExpiresAt) CreateToken(AuthenticatedUser user)
    {
        var section = configuration.GetSection("Jwt");
        var key = section["Key"] ?? throw new InvalidOperationException("JWT key is not configured.");
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(section.GetValue<int>("ExpiryMinutes", 60));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserId),
            new(ClaimTypes.NameIdentifier, user.UserId),
            new("roleId", user.RoleId.ToString()),
            new("roleCode", user.RoleCode),
            new("langCode", user.LangCode.ToString()),
            new("loginSessionId", user.LoginSessionId.ToString()),
            new("departmentId", user.DepartmentId?.ToString() ?? string.Empty),
            new("officeId", user.OfficeId?.ToString() ?? string.Empty)
        };
        if (user.EmployeeId.HasValue) claims.Add(new("employeeId", user.EmployeeId.Value.ToString()));
        if (user.OfficialId.HasValue) claims.Add(new("officialId", user.OfficialId.Value.ToString()));
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(
            section["Issuer"], section["Audience"], claims,
            expires: expiresAt.UtcDateTime, signingCredentials: credentials);
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expiresAt);
    }
}
