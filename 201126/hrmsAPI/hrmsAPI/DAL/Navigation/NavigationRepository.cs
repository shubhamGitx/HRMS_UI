using System.Data;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Navigation;

namespace HRMSAPI.DAL.Navigation;

public sealed class NavigationRepository(PostgreSqlDataAccess dataAccess) : INavigationRepository
{
    public async Task<IReadOnlyList<MenuRecord>> GetMenuByRoleAsync(string roleCode, short langCode, CancellationToken cancellationToken)
    {
        const string query = """
            WITH RECURSIVE permitted_menu AS (
                SELECT m.menu_id, m.menu_name, m.parent_id, m.route_url, m.icon_class,
                       m.display_order, m.is_heading
                FROM menu.role_menu_mapping rm
                JOIN menu.menu_master m ON m.menu_id = rm.menu_id AND m.lang_code = @lang_code
                WHERE rm.user_role_id = @role_code
                  AND rm.is_active = true
                  AND m.is_active = true

                UNION

                SELECT parent.menu_id, parent.menu_name, parent.parent_id, parent.route_url,
                       parent.icon_class, parent.display_order, parent.is_heading
                FROM menu.menu_master parent
                JOIN permitted_menu child ON child.parent_id = parent.menu_id
                WHERE parent.is_active = true
                  AND parent.lang_code = @lang_code
            )
            SELECT DISTINCT menu_id, menu_name, parent_id, route_url, icon_class,
                            display_order, is_heading
            FROM permitted_menu
            ORDER BY display_order, menu_id;
            """;

        var table = await dataAccess.GetDataTableAsync(query,
            new Dictionary<string, object?> { ["role_code"] = roleCode, ["lang_code"] = langCode }, cancellationToken);

        return table.Rows.Cast<DataRow>()
            .Select(row =>
            {
                long? parentId = row["parent_id"] is DBNull ? 0 : Convert.ToInt64(row["parent_id"]);
                return new MenuRecord(
                    Convert.ToInt64(row["menu_id"]),
                    Convert.ToString(row["menu_name"])?.Trim() ?? string.Empty,
                    parentId,
                    row["route_url"] is DBNull ? null : Convert.ToString(row["route_url"]),
                    row["icon_class"] is DBNull || string.IsNullOrWhiteSpace(Convert.ToString(row["icon_class"]))
                        ? "bi-circle"
                        : Convert.ToString(row["icon_class"])!.Trim(),
                    Convert.ToInt32(row["display_order"]),
                    Convert.ToBoolean(row["is_heading"]));
            })
            .ToList();
    }
}
