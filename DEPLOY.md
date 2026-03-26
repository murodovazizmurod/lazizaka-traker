# Deploying Lazizaka Calculator

## Ubuntu Deployment / Systemd Service

To run this application as a permanent service on Ubuntu:

1. **Install Prerequisites**:
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv gunicorn
   ```

2. **Prepare the Application**:
   Move the project to its directory (e.g., `/var/www/lazizaka-calculator`) and set permissions:
   ```bash
   sudo chown -R www-data:www-data /var/www/lazizaka-calculator
   ```

3. **Configure the Service**:
   Copy the provided `lazizaka.service` to the systemd directory:
   ```bash
   sudo cp lazizaka.service /etc/systemd/system/lazizaka.service
   ```
   *Note: Edit `/etc/systemd/system/lazizaka.service` to update `WorkingDirectory`, `ExecStart` paths, and environment variables if necessary.*

4. **Start and Enable**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable lazizaka
   sudo systemctl start lazizaka
   ```

5. **Verify**:
   Check if the service is running on port 7523:
   ```bash
   sudo systemctl status lazizaka
   curl http://localhost:7523/api/health
   ```
