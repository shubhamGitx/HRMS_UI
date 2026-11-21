using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Login;

public interface IJwtService
{
    (string Token, DateTimeOffset ExpiresAt) CreateToken(AuthenticatedUser user);
}
