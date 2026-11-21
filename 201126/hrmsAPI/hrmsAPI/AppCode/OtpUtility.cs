using System.Security.Cryptography;
using System.Text;

namespace HRMSAPI.AppCode;

public static class OtpUtility
{
    public static string Generate() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    public static string Hash(string otp) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(otp)));

    public static bool Verify(string otp, string storedHash) =>
        CryptographicOperations.FixedTimeEquals(
            Convert.FromHexString(Hash(otp)),
            Convert.FromHexString(storedHash));
}
