using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace LaboratorioNumerico.Desktop;

/// <summary>
/// Ventana nativa del juego: pantalla de carga mientras arranca el motor y después un WebView2
/// a pantalla completa con el juego. F11 alterna pantalla completa.
/// </summary>
internal sealed class VentanaPrincipal : Form
{
    private const string TituloBase = "Escape del Laboratorio Numérico II — Edición DELUXE";
    private const string UrlRuntimeWebView2 = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

    // Paleta «Cinta de Plata»: tinta sobre plata.
    private static readonly Color Tinta = Color.FromArgb(17, 17, 17);
    private static readonly Color Plata = Color.FromArgb(222, 218, 208);

    private readonly WebView2 _web = new() { Dock = DockStyle.Fill, Visible = false, DefaultBackgroundColor = Tinta };
    private readonly Label _estado;
    private readonly MotorLocal _motor = new();
    private readonly CancellationTokenSource _cierre = new();

    private Uri? _origen;
    private bool _pantallaCompleta;
    private FormWindowState _estadoPrevio;

    public VentanaPrincipal()
    {
        Text = TituloBase;
        BackColor = Tinta;
        ForeColor = Plata;
        MinimumSize = new Size(960, 600);
        Size = new Size(1366, 820);
        StartPosition = FormStartPosition.CenterScreen;
        KeyPreview = true;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { /* sin icono */ }

        _estado = new Label
        {
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font(FontFamily.GenericMonospace, 14f, FontStyle.Regular),
            ForeColor = Plata,
            BackColor = Tinta,
            Text = "Preparando el laboratorio…",
        };

        Controls.Add(_web);
        Controls.Add(_estado);
    }

    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        try
        {
            var progreso = new Progress<string>(m => _estado.Text = m);
            Task<Uri> motor = _motor.IniciarAsync(progreso, _cierre.Token);
            Task web = PrepararWebViewAsync();
            await Task.WhenAll(motor, web);

            _origen = motor.Result;
            _web.CoreWebView2.Navigate(_origen.ToString());
        }
        catch (OperationCanceledException) { }
        catch (WebView2RuntimeNotFoundException)
        {
            var r = MessageBox.Show(
                "Para abrir el juego se necesita Microsoft Edge WebView2 Runtime (viene incluido en Windows 10/11 actualizados).\n\n¿Abrir la página de descarga?",
                TituloBase, MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (r == DialogResult.Yes) AbrirExterno(UrlRuntimeWebView2);
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"No se pudo iniciar el laboratorio.\n\n{ex.Message}", TituloBase,
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private async Task PrepararWebViewAsync()
    {
        // Perfil en %LOCALAPPDATA% (la carpeta del .exe puede no tener permisos de escritura).
        string datos = Path.Combine(MotorLocal.CarpetaApp, "WebView2");
        var entorno = await CoreWebView2Environment.CreateAsync(userDataFolder: datos);
        await _web.EnsureCoreWebView2Async(entorno);

        CoreWebView2 core = _web.CoreWebView2;
#if DEBUG
        core.Settings.AreDevToolsEnabled = true;
#else
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
#endif
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.AreBrowserAcceleratorKeysEnabled = false; // sin Ctrl+R, Ctrl+P, F5… dentro del juego
        core.Settings.IsGeneralAutofillEnabled = false;
        core.Settings.IsPasswordAutosaveEnabled = false;

        core.DocumentTitleChanged += (_, _) =>
            Text = string.IsNullOrWhiteSpace(core.DocumentTitle) ? TituloBase : core.DocumentTitle;

        core.NavigationCompleted += (_, a) =>
        {
            if (!a.IsSuccess || _web.Visible) return;
            _web.Visible = true;
            _estado.Visible = false;
            _web.Focus();
        };

        // Cámara para fotografiar el procedimiento (Modo Comprobación): solo para el propio juego.
        core.PermissionRequested += (_, a) =>
        {
            if (EsPropio(a.Uri) && a.PermissionKind == CoreWebView2PermissionKind.Camera)
                a.State = CoreWebView2PermissionState.Allow;
        };

        // Enlaces externos (libro, documentación…) se abren en el navegador del sistema.
        core.NewWindowRequested += (_, a) =>
        {
            a.Handled = true;
            if (EsPropio(a.Uri)) core.Navigate(a.Uri);
            else AbrirExterno(a.Uri);
        };
        core.NavigationStarting += (_, a) =>
        {
            if (_origen is null || EsPropio(a.Uri)) return;
            a.Cancel = true;
            AbrirExterno(a.Uri);
        };

        // requestFullscreen() del juego ↔ pantalla completa de la ventana.
        core.ContainsFullScreenElementChanged += (_, _) => PonerPantallaCompleta(core.ContainsFullScreenElement);
    }

    private bool EsPropio(string uri) =>
        _origen is not null && Uri.TryCreate(uri, UriKind.Absolute, out var u)
        && Uri.Compare(u, _origen, UriComponents.SchemeAndServer, UriFormat.Unescaped, StringComparison.OrdinalIgnoreCase) == 0;

    private static void AbrirExterno(string uri)
    {
        if (!Uri.TryCreate(uri, UriKind.Absolute, out var u) || (u.Scheme != Uri.UriSchemeHttps && u.Scheme != Uri.UriSchemeHttp))
            return;
        try { Process.Start(new ProcessStartInfo(u.AbsoluteUri) { UseShellExecute = true }); } catch { }
    }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == Keys.F11)
        {
            PonerPantallaCompleta(!_pantallaCompleta);
            return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    private void PonerPantallaCompleta(bool activar)
    {
        if (activar == _pantallaCompleta) return;
        _pantallaCompleta = activar;
        if (activar)
        {
            _estadoPrevio = WindowState;
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Normal; // necesario para que Maximized cubra la barra de tareas
            WindowState = FormWindowState.Maximized;
        }
        else
        {
            FormBorderStyle = FormBorderStyle.Sizable;
            WindowState = _estadoPrevio;
        }
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        _cierre.Cancel();
        base.OnFormClosing(e);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _web.Dispose();
            _motor.Dispose();
            _cierre.Dispose();
        }
        base.Dispose(disposing);
    }
}
