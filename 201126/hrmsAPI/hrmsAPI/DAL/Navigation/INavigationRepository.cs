using HRMSAPI.MODEL.Navigation;

namespace HRMSAPI.DAL.Navigation;

public interface INavigationRepository
{
    Task<IReadOnlyList<MenuRecord>> GetMenuByRoleAsync(string roleCode, short langCode, CancellationToken cancellationToken);
}
