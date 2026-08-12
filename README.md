# Phantom Access

**Cloud Identity Attack & Zero Trust Defense Lab**

Phantom Access is a safe, browser-based blue-team simulation that demonstrates how stolen credentials, MFA fatigue, session-token theft, and account persistence can turn a trusted identity into a critical cloud incident.

The visitor acts as the incident responder. They replay the intrusion, deploy defenses, investigate correlated evidence, and receive a scored after-action report. All identities, organizations, IP addresses, and events are fictional. No real credentials, cloud tenant, malware, or attack infrastructure are used.

<img width="1280" height="800" alt="Image" src="https://github.com/user-attachments/assets/42b41585-4d05-45b7-9a53-349b86b90842" />

<img width="1280" height="911" alt="Image" src="https://github.com/user-attachments/assets/b6406fa3-92d7-4d8c-90bf-b082e9297d2a" />

<img width="1280" height="911" alt="Image" src="https://github.com/user-attachments/assets/b71110b7-b9ef-42f3-acbf-42be40b6718b" />

<img width="1280" height="911" alt="Image" src="https://github.com/user-attachments/assets/2bd3d7d6-1005-471e-9d08-f69200acbc32" />

<img width="1280" height="911" alt="Image" src="https://github.com/user-attachments/assets/efd149e0-00e5-4563-a2e8-2a0ece9a4671" />

<img width="1280" height="911" alt="Image" src="https://github.com/user-attachments/assets/8dbfd113-65a4-4791-92be-1ef0497e93c6" />

<img width="1280" height="911" alt="Image" src="https://github.com/user-attachments/assets/2e8a13d7-0e19-4476-9f95-bd709b698490" />

<img width="1280" height="911" alt="Image" src="https://github.com/user-attachments/assets/4dc0b5a1-161f-4de7-a52d-099832676c27" />

## Lab Experience

1. **Mission Brief** — Review the fictional organization, compromised user, objectives, and incident scope.
2. **Attack Replay** — Step through seven timed events from valid-account access to sensitive-data staging.
3. **Case Console** — Watch six fictional `phantom` CLI commands investigate identity context, MFA fatigue, session replay, cloud persistence, Zero Trust gaps, and the response plan.
4. **Defense Console** — Compare high-impact controls with limited actions such as password-only resets and IP blocking.
5. **Evidence Room** — Correlate authentication, MFA, session, audit, and data-access telemetry.
6. **After-Action Report** — Review the final score, controls deployed, key lessons, and download a text report.

## Techniques Demonstrated

- MITRE ATT&CK T1078 — Valid Accounts
- MITRE ATT&CK T1621 — Multi-Factor Authentication Request Generation
- MITRE ATT&CK T1539 — Steal Web Session Cookie
- MITRE ATT&CK T1098.005 — Account Manipulation: Device Registration
- MITRE ATT&CK T1213 — Data from Information Repositories
- Phishing-resistant MFA
- Conditional access and device trust
- Session revocation and account containment
- Command-driven identity investigation
- Zero Trust access-decision analysis
- Evidence correlation and chain of custody

## Run on Kali Linux

### Requirements

- Node.js 22.13 or newer
- npm

### Installation

```bash
unzip phantom-access.zip
cd phantom-access
npm install
npm run dev -- --host 0.0.0.0
```

Open the local address printed in the terminal. Stop the lab with `Ctrl+C`.

### Production Build

```bash
npm run build
```

## Project Structure

```text
phantom-access/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── package.json
└── README.md
```

## Safety

This application is an educational simulation. The `phantom` CLI and all terminal output are fictional and execute no system commands. The project contains no credential-harvesting features, exploit code, live attack tooling, or connections to external identity providers.

## License

Released for educational and portfolio use.
