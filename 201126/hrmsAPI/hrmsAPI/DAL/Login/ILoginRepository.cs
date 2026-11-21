using HRMSAPI.MODEL.Login;

namespace HRMSAPI.DAL.Login;

public interface ILoginRepository
{
    Task<LoginUser?> GetUserAsync(string userId, UserRole role, CancellationToken cancellationToken);
    Task UpdatePasswordAsync(string userId, UserRole role, string passwordHash, string changedBy, CancellationToken cancellationToken);
}
