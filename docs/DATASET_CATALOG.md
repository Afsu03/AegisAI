# AegisAI Demonstration Dataset Catalog

> [!NOTE]
> **SYNTHETIC DEMONSTRATION DATA**: The 10 datasets listed below contain synthetic security telemetry generated specifically for multi-format parser validation and research demonstration. They are not real-world production logs.

| Dataset File | Format | Scenario Description | Expected Rule | Expected Threat | Coordinates Present | Primary Purpose |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **`dataset-01-normal-auth.csv`** | `CSV` | 5 routine successful logins across diverse roles | None | None | No | Baseline normal verification |
| **`dataset-02-brute-force.json`** | `JSON` | 6 rapid consecutive failures on `admin` | Rule 1 | Possible Brute Force Attack (`85/100`) | No | Brute force detection & 4-agent triage |
| **`dataset-03-privileged-activity.jsonl`** | `JSONL` | 3 consecutive failures on superuser `root` | Rule 5 | Suspicious Privileged Activity (`70/100`) | No | Targeted privileged account monitoring |
| **`dataset-04-impossible-travel.xlsx`** | `XLSX` | Logins from NYC & London in 30 min | Rule 4 | Impossible Travel (`80/100`) | Yes | Geographic coordinate & speed validation |
| **`dataset-05-benign-location.xml`** | `XML` | Country change (USA $\rightarrow$ Canada) in 20 min | None | None (Conservative Rule 4 guard) | No | False positive mitigation check |
| **`dataset-06-mixed-authentication.csv`** | `CSV` | Mixed normal logins, typos, and isolated probes | None | None | No | Operational noise resilience |
| **`dataset-07-api-authentication.json`** | `JSON` | Automated microservice token requests | None | None | No | Machine-to-machine API telemetry validation |
| **`dataset-08-enterprise-auth.jsonl`** | `JSONL` | Enterprise SSO SAML authentication events | None | None | No | Identity provider (IdP) log validation |
| **`dataset-09-mixed-security-events.xlsx`** | `XLSX` | VPN gateway tunnel state telemetry | None | None | No | Network perimeter telemetry parsing |
| **`dataset-10-coordinate-travel.xml`** | `XML` | Logins from San Francisco & Tokyo in 45 min | Rule 4 | Impossible Travel (`80/100`) | Yes | Multi-format XML coordinate travel testing |
