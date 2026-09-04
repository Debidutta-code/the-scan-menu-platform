# The Scan Menu – Local Print Agent (v1.0.0)

A lightweight, high-speed local background print agent for **The Scan Menu POS**.

## How It Works
1. **The Scan Menu POS** runs in your browser (e.g., Chrome/Edge).
2. When you settle an order or click **Print Customer Bill / KOT**, the Web POS sends a local HTTP request to `http://127.0.0.1:18181/print`.
3. **The Local Print Agent** receives the order, formats it into standard ESC/POS binary data (with 80mm/58mm column wrapping, item add-ons, tax breakdown, and auto-cut), and transmits it directly over your local private network (TCP port 9100) to your thermal POS receipt printer (e.g. `192.168.1.100:9100`).
4. **Zero-Click Silent Printing**: Receipts and Kitchen Tokens print instantly without showing the browser print dialog.
5. **Universal Fallback**: If the Local Print Agent is closed, the Web POS automatically falls back to browser thermal printing.

---

## Quick Start (Windows)

1. **Install Dependencies & Build** (one-time setup):
   ```bash
   cd print-agent
   npm install
   npm run build
   ```

2. **Run the Print Agent**:
   - Double-click `start-agent.bat` OR run:
   ```bash
   npm start
   ```

3. **Verify Connection**:
   - Open your browser and navigate to `http://127.0.0.1:18181/health`.
   - You should see:
   ```json
   { "status": "ok", "service": "scanmenu-print-agent", "version": "1.0.0" }
   ```

---

## Configuration in The Scan Menu POS
1. Open **The Scan Menu POS > Settings > Printer Studio**.
2. Set your Counter Thermal Printer IP (e.g. `192.168.1.100`) and Port (`9100`).
3. Click **Test Slip** to verify silent LAN printing!
