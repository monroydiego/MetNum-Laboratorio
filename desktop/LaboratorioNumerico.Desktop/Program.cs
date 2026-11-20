namespace LaboratorioNumerico.Desktop;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        // Una sola instancia: dos motores compartirían la misma BD SQLite y el mismo puerto.
        using var unica = new Mutex(initiallyOwned: true, @"Local\LaboratorioNumericoDeluxe", out bool esPrimera);
        if (!esPrimera)
        {
            MessageBox.Show(
                "El Laboratorio Numérico ya está abierto.",
                "Laboratorio Numérico",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new VentanaPrincipal());
    }
}
