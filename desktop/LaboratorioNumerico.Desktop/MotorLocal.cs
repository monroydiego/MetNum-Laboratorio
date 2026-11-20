using System.Diagnostics;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;

namespace LaboratorioNumerico.Desktop;

/// <summary>
/// Prepara y arranca el motor numérico (FastAPI + juego estático, empaquetado con PyInstaller).
///
/// - El motor viaja incrustado en el .exe (recurso «motor.zip») y se extrae en
///   %LOCALAPPDATA%\LaboratorioNumerico\motor la primera vez o cuando cambia su versión.
///   La BD (data\) y las fotos de evidencias (uploads\) se conservan entre versiones.
/// - Sin recurso incrustado (compilación de desarrollo) se usa la carpeta motor\ junto al .exe.
/// </summary>
internal sealed class MotorLocal : IDisposable
{
    /// <summary>
    /// Puerto fijo: localStorage (la partida guardada) depende del origen http://127.0.0.1:puerto,
    /// así que siempre se intenta el mismo para no perder la partida entre sesiones.
    /// </summary>
    private const int PuertoPreferido = 48650;

    private static readonly string[] CarpetasPersistentes = ["data", "uploads"];

    public static string CarpetaApp { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LaboratorioNumerico");

    public static string ArchivoLog { get; } = Path.Combine(CarpetaApp, "logs", "motor.log");

    private readonly TrabajoWindows _trabajo = new();
    private Process? _proceso;
    private StreamWriter? _log;

    public bool UsaPuertoPreferido { get; private set; } = true;

    /// <summary>Extrae (si hace falta), arranca el motor y espera a que responda. Devuelve la URL del juego.</summary>
    public async Task<Uri> IniciarAsync(IProgress<string> progreso, CancellationToken ct)
    {
        string motorExe = await Task.Run(() => PrepararCarpeta(progreso), ct);

        int puerto = ElegirPuerto();
        UsaPuertoPreferido = puerto == PuertoPreferido;
        progreso.Report("Encendiendo el motor numérico…");

        Directory.CreateDirectory(Path.GetDirectoryName(ArchivoLog)!);
        _log = new StreamWriter(ArchivoLog, append: false) { AutoFlush = true };
        _log.WriteLine($"[{DateTime.Now:O}] Iniciando {motorExe} en el puerto {puerto}");

        var inicio = new ProcessStartInfo(motorExe)
        {
            WorkingDirectory = Path.GetDirectoryName(motorExe)!,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        inicio.ArgumentList.Add("--puerto");
        inicio.ArgumentList.Add(puerto.ToString());
        inicio.Environment["PYTHONUTF8"] = "1";
        inicio.Environment["PYTHONIOENCODING"] = "utf-8";

        _proceso = new Process { StartInfo = inicio, EnableRaisingEvents = true };
        _proceso.OutputDataReceived += (_, e) => EscribirLog(e.Data);
        _proceso.ErrorDataReceived += (_, e) => EscribirLog(e.Data);
        _proceso.Start();
        _trabajo.Agregar(_proceso);
        _proceso.BeginOutputReadLine();
        _proceso.BeginErrorReadLine();

        var url = new Uri($"http://127.0.0.1:{puerto}/");
        await EsperarSaludAsync(url, ct);
        return url;
    }

    private void EscribirLog(string? linea)
    {
        if (linea is null || _log is null) return;
        try
        {
            lock (_log) _log.WriteLine(linea);
        }
        catch (ObjectDisposedException) { } // el motor aún escribía mientras se cerraba la ventana
    }

    private async Task EsperarSaludAsync(Uri url, CancellationToken ct)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
        var limite = DateTime.UtcNow.AddSeconds(90);
        while (DateTime.UtcNow < limite)
        {
            ct.ThrowIfCancellationRequested();
            if (_proceso is { HasExited: true })
                throw new InvalidOperationException(
                    $"El motor numérico se cerró al arrancar (código {_proceso.ExitCode}).\nRevisa el registro: {ArchivoLog}");
            try
            {
                using var r = await http.GetAsync(new Uri(url, "api/salud"), ct);
                if (r.IsSuccessStatusCode) return;
            }
            catch (HttpRequestException) { }
            catch (TaskCanceledException) when (!ct.IsCancellationRequested) { }
            await Task.Delay(250, ct);
        }
        throw new TimeoutException($"El motor numérico no respondió a tiempo.\nRevisa el registro: {ArchivoLog}");
    }

    private static int ElegirPuerto()
    {
        foreach (int candidato in new[] { PuertoPreferido, 0 })
        {
            try
            {
                var l = new TcpListener(IPAddress.Loopback, candidato);
                l.Start();
                int p = ((IPEndPoint)l.LocalEndpoint).Port;
                l.Stop();
                return p;
            }
            catch (SocketException) when (candidato != 0) { }
        }
        throw new InvalidOperationException("No hay puertos libres.");
    }

    /// <summary>Devuelve la ruta de motor.exe, extrayendo el recurso incrustado si cambió de versión.</summary>
    private static string PrepararCarpeta(IProgress<string> progreso)
    {
        var asm = Assembly.GetExecutingAssembly();
        using Stream? zip = asm.GetManifestResourceStream("motor.zip");
        using Stream? ver = asm.GetManifestResourceStream("motor.version");

        if (zip is null || ver is null)
        {
            // Compilación de desarrollo: motor\ junto al ejecutable.
            string local = Path.Combine(AppContext.BaseDirectory, "motor", "motor.exe");
            if (!File.Exists(local))
                throw new FileNotFoundException(
                    "Este ejecutable no incluye el motor numérico. Genéralo con desktop\\build.ps1.", local);
            return local;
        }

        string version = new StreamReader(ver).ReadToEnd().Trim();
        string destino = Path.Combine(CarpetaApp, "motor");
        string archivoVersion = Path.Combine(destino, "version.txt");
        string motorExe = Path.Combine(destino, "motor.exe");

        if (File.Exists(motorExe) && File.Exists(archivoVersion) && File.ReadAllText(archivoVersion).Trim() == version)
            return motorExe;

        progreso.Report("Instalando el motor numérico (solo la primera vez)…");
        Directory.CreateDirectory(CarpetaApp);
        string nuevo = destino + ".nuevo";
        if (Directory.Exists(nuevo)) Directory.Delete(nuevo, recursive: true);
        ZipFile.ExtractToDirectory(zip, nuevo);

        // Conserva la BD y las evidencias de la versión anterior.
        if (Directory.Exists(destino))
        {
            foreach (string carpeta in CarpetasPersistentes)
            {
                string vieja = Path.Combine(destino, carpeta);
                if (!Directory.Exists(vieja)) continue;
                string enNuevo = Path.Combine(nuevo, carpeta);
                if (Directory.Exists(enNuevo)) Directory.Delete(enNuevo, recursive: true);
                Directory.Move(vieja, enNuevo);
            }
            Directory.Delete(destino, recursive: true);
        }
        Directory.Move(nuevo, destino);
        File.WriteAllText(archivoVersion, version);
        return motorExe;
    }

    public void Dispose()
    {
        try
        {
            if (_proceso is { HasExited: false })
            {
                _proceso.Kill(entireProcessTree: true);
                _proceso.WaitForExit(3000);
            }
        }
        catch (InvalidOperationException) { }
        _proceso?.Dispose();
        _trabajo.Dispose(); // KILL_ON_JOB_CLOSE: garantiza que no quede nada vivo
        _log?.Dispose();
    }
}
