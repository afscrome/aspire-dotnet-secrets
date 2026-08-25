using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Publishing;

namespace AlexCrome.Aspire.Hosting.UserJwts;

internal sealed class Base64ParameterDefault(int byteLength) : ParameterDefault
{
    public int ByteLength { get; } = byteLength > 0
        ? byteLength
        : throw new ArgumentOutOfRangeException(nameof(byteLength));

    public override string GetDefaultValue()
    {
        return Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(ByteLength));
    }

    public override void WriteToManifest(ManifestPublishingContext context)
    {
        context.Writer.WriteStartObject("generateBase64");
        context.Writer.WriteNumber("byteLength", ByteLength);
        context.Writer.WriteEndObject();
    }
}
