namespace HRMSAPI.MODEL.Navigation;

public sealed record MenuRecord(
    long Id,
    string Label,
    long? ParentId,
    string? Route,
    string Icon,
    int DisplayOrder,
    bool IsHeading);

public sealed class MenuItemResponse
{
    public long Id { get; init; }
    public string Label { get; init; } = string.Empty;
    public string Icon { get; init; } = string.Empty;
    public string? Route { get; init; }
    public bool IsHeading { get; init; }
    public List<MenuItemResponse> Children { get; init; } = [];
}
