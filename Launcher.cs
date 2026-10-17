using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;

namespace Meeetly
{
    static class Program
    {
        static Process serverProc = null;
        static NotifyIcon trayIcon = null;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string nodePath = Path.Combine(appDir, "node.exe");
            string serverScript = Path.Combine(appDir, "server", "index.js");

            if (!File.Exists(nodePath))
            {
                MessageBox.Show("node.exe not found in " + appDir, "MEEETLY Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // Start backend node server silently
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodePath;
                psi.Arguments = "\"" + serverScript + "\"";
                psi.WorkingDirectory = appDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;

                serverProc = Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to start MEEETLY server:\n" + ex.Message, "MEEETLY", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // Setup tray icon
            try
            {
                trayIcon = new NotifyIcon();
                string icoPath = Path.Combine(appDir, "app.ico");
                if (File.Exists(icoPath))
                {
                    trayIcon.Icon = new Icon(icoPath);
                }
                else
                {
                    trayIcon.Icon = SystemIcons.Application;
                }
                trayIcon.Text = "MEEETLY Calendar";
                trayIcon.Visible = true;

                ContextMenu menu = new ContextMenu();
                menu.MenuItems.Add("Open Admin Portal", (s, e) => LaunchBrowser("http://localhost:5000/?portal=admin"));
                menu.MenuItems.Add("Open Sales Portal", (s, e) => LaunchBrowser("http://localhost:5000/?portal=sales"));
                menu.MenuItems.Add("Open User Workspace", (s, e) => LaunchBrowser("http://localhost:5000/?portal=user"));
                menu.MenuItems.Add("Open Client Booking", (s, e) => LaunchBrowser("http://localhost:5000/?mode=book"));
                menu.MenuItems.Add("-");
                menu.MenuItems.Add("Exit MEEETLY", (s, e) => ExitApp());
                trayIcon.ContextMenu = menu;
            }
            catch { }

            // Ensure server process is terminated when app exits
            AppDomain.CurrentDomain.ProcessExit += (s, e) => Shutdown();

            // Wait briefly for server to bind ports
            Thread.Sleep(800);

            // Open dedicated desktop window
            LaunchBrowser("http://localhost:5000/?portal=admin");

            Application.Run();
        }

        static void LaunchBrowser(string url)
        {
            try
            {
                string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
                if (!File.Exists(edgePath))
                {
                    edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");
                }

                if (File.Exists(edgePath))
                {
                    Process.Start(edgePath, "--app=" + url);
                }
                else
                {
                    Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                }
            }
            catch
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
        }

        static void Shutdown()
        {
            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
                if (serverProc != null && !serverProc.HasExited)
                {
                    serverProc.Kill();
                }
            }
            catch { }
        }

        static void ExitApp()
        {
            Shutdown();
            Application.Exit();
            Environment.Exit(0);
        }
    }
}
