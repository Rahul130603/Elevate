using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace MeeetlySetup
{
    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblHeader;
        private Label lblSubHeader;
        private Button btnAction;
        private PictureBox picIcon;

        public InstallerForm()
        {
            this.Text = "MEEETLY Calendar Setup";
            this.Size = new Size(520, 310);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point, ((byte)(0)));

            // App Icon on Form
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("MEEETLY.app.ico"))
                {
                    if (s != null) this.Icon = new Icon(s);
                }
            }
            catch { }

            // Header Banner Panel
            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 85;
            pnlHeader.BackColor = Color.White;
            pnlHeader.Paint += (s, e) => {
                e.Graphics.DrawLine(new Pen(Color.FromArgb(226, 232, 240)), 0, 84, 520, 84);
            };

            picIcon = new PictureBox();
            picIcon.Location = new Point(20, 16);
            picIcon.Size = new Size(52, 52);
            picIcon.SizeMode = PictureBoxSizeMode.Zoom;
            if (this.Icon != null) picIcon.Image = this.Icon.ToBitmap();
            pnlHeader.Controls.Add(picIcon);

            lblHeader = new Label();
            lblHeader.Text = "Installing MEEETLY Calendar";
            lblHeader.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            lblHeader.ForeColor = Color.FromArgb(15, 23, 42);
            lblHeader.Location = new Point(82, 18);
            lblHeader.AutoSize = true;
            pnlHeader.Controls.Add(lblHeader);

            lblSubHeader = new Label();
            lblSubHeader.Text = "Setting up executive calendar and booking system on your PC...";
            lblSubHeader.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSubHeader.ForeColor = Color.FromArgb(100, 116, 139);
            lblSubHeader.Location = new Point(83, 44);
            lblSubHeader.AutoSize = true;
            pnlHeader.Controls.Add(lblSubHeader);

            this.Controls.Add(pnlHeader);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(30, 125);
            progressBar.Size = new Size(445, 26);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            // Status Label
            lblStatus = new Label();
            lblStatus.Text = "Initializing setup components...";
            lblStatus.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(71, 85, 105);
            lblStatus.Location = new Point(30, 160);
            lblStatus.Size = new Size(445, 22);
            this.Controls.Add(lblStatus);

            // Action Button (hidden initially, shown on complete)
            btnAction = new Button();
            btnAction.Text = "Launch MEEETLY";
            btnAction.Size = new Size(130, 34);
            btnAction.Location = new Point(345, 215);
            btnAction.BackColor = Color.FromArgb(249, 115, 22);
            btnAction.ForeColor = Color.White;
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnAction.Cursor = Cursors.Hand;
            btnAction.Visible = false;
            btnAction.Click += (s, e) => {
                LaunchInstalledApp();
                this.Close();
            };
            this.Controls.Add(btnAction);

            this.Shown += async (s, e) => {
                await Task.Run(() => PerformInstallation());
            };
        }

        private void SetStatus(string msg, int pct)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(() => SetStatus(msg, pct)));
                return;
            }
            lblStatus.Text = msg;
            if (pct >= 0 && pct <= 100) progressBar.Value = pct;
        }

        private void PerformInstallation()
        {
            try
            {
                SetStatus("Preparing target directory...", 10);
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string targetDir = Path.Combine(localAppData, "MEEETLY");

                if (!Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                }

                SetStatus("Extracting application packages...", 25);

                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream zipStream = asm.GetManifestResourceStream("MEEETLY.payload.zip"))
                {
                    if (zipStream == null)
                    {
                        throw new Exception("Installation package resource 'MEEETLY.payload.zip' not found in installer binary.");
                    }

                    using (ZipArchive archive = new ZipArchive(zipStream, ZipArchiveMode.Read))
                    {
                        int total = archive.Entries.Count;
                        int current = 0;

                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            current++;
                            int pct = 25 + (int)((current / (double)total) * 55);

                            string destPath = Path.Combine(targetDir, entry.FullName.Replace('/', '\\'));

                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                Directory.CreateDirectory(destPath);
                                continue;
                            }

                            string dirName = Path.GetDirectoryName(destPath);
                            if (!Directory.Exists(dirName))
                            {
                                Directory.CreateDirectory(dirName);
                            }

                            SetStatus("Extracting: " + entry.Name, pct);
                            entry.ExtractToFile(destPath, true);
                        }
                    }
                }

                SetStatus("Creating Desktop shortcut...", 85);
                CreateDesktopShortcut(targetDir);

                SetStatus("Installation complete! Starting MEEETLY...", 100);

                // Auto launch app
                LaunchInstalledApp();

                this.Invoke(new Action(() => {
                    lblHeader.Text = "Installation Complete!";
                    lblSubHeader.Text = "MEEETLY Calendar is installed and running on your PC.";
                    lblStatus.Text = "Click Launch to open or view Desktop shortcut.";
                    btnAction.Visible = true;
                    btnAction.Text = "Finish";
                }));
            }
            catch (Exception ex)
            {
                this.Invoke(new Action(() => {
                    MessageBox.Show(this, "Installation encountered an issue:\n" + ex.Message, "MEEETLY Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    this.Close();
                }));
            }
        }

        private void CreateDesktopShortcut(string targetDir)
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktop, "MEEETLY Calendar.lnk");
                string exePath = Path.Combine(targetDir, "MEEETLY.exe");
                string icoPath = Path.Combine(targetDir, "app.ico");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = exePath;
                    shortcut.WorkingDirectory = targetDir;
                    shortcut.Description = "MEEETLY Executive Calendar & Appointments";
                    if (File.Exists(icoPath))
                    {
                        shortcut.IconLocation = icoPath + ",0";
                    }
                    shortcut.Save();
                }
            }
            catch { }
        }

        private void LaunchInstalledApp()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string exePath = Path.Combine(localAppData, "MEEETLY", "MEEETLY.exe");
                if (File.Exists(exePath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo(exePath);
                    psi.WorkingDirectory = Path.GetDirectoryName(exePath);
                    Process.Start(psi);
                }
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }
}
