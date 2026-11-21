using HRMSAPI.MODEL.Navigation;

namespace HRMSAPI.BAL.Navigation;

public interface INavigationService
{
    Task<IReadOnlyList<MenuItemResponse>> GetMenuAsync(string roleCode, short langCode, CancellationToken cancellationToken);
}
