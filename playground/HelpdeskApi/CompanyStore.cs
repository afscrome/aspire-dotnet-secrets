namespace HelpdeskApi;

public sealed record Company(string Id, string Name);

public sealed record CreateCompanyRequest(string Id, string Name);

public sealed class CompanyStore
{
    private readonly List<Company> _companies = [];

    public CompanyStore()
    {
        _companies.Add(new Company("acme", "Acme Corp"));
        _companies.Add(new Company("globex", "Globex Corporation"));
    }

    public IReadOnlyList<Company> GetAll() =>
        _companies.OrderBy(c => c.Name, StringComparer.Ordinal).ToList();

    public Company? Find(string id) =>
        _companies.FirstOrDefault(c => string.Equals(c.Id, id, StringComparison.Ordinal));

    public Company? Add(string id, string name)
    {
        if (Find(id) is not null)
        {
            return null;
        }

        var company = new Company(id, name);
        _companies.Add(company);
        return company;
    }

    public bool Remove(string id)
    {
        var company = Find(id);
        return company is not null && _companies.Remove(company);
    }
}
