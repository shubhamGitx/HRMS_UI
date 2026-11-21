using HRMSAPI.DAL.Navigation;
using HRMSAPI.MODEL.Navigation;

namespace HRMSAPI.BAL.Navigation;

public sealed class NavigationService(INavigationRepository repository) : INavigationService
{
    public async Task<IReadOnlyList<MenuItemResponse>> GetMenuAsync(string roleCode, short langCode, CancellationToken cancellationToken)
    {
        var records = await repository.GetMenuByRoleAsync(roleCode, langCode, cancellationToken);
        return BuildLevel(records, 0);
    }

    private static List<MenuItemResponse> BuildLevel(IReadOnlyList<MenuRecord> records, long? parentId) =>
        records.Where(item => item.ParentId == parentId)
            .OrderBy(item => item.DisplayOrder).ThenBy(item => item.Id)
            .Select(item => new MenuItemResponse
            {
                Id = item.Id,
                Label = item.Label,
                Icon = item.Icon,
                Route = item.Route,
                IsHeading = item.IsHeading,
                Children = BuildLevel(records, item.Id)
            })
            .ToList();
}
