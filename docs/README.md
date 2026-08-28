# AegisAI Demonstration & Testing Security Datasets

## Purpose
This directory contains 10 synthetic demonstration datasets formatted across all five currently supported ingestion specifications (`CSV`, `JSON`, `JSONL`, `XLSX`, `XML`). They are intended for demonstration, testing, parser validation, and future research experiments.

> [!IMPORTANT]
> **Synthetic-Data Disclaimer**:
> These datasets contain synthetic demonstration/testing telemetry and are **not** part of the authoritative IEEE benchmark unless explicitly included in a separately documented experiment. The authoritative benchmark dataset for IEEE evaluation remains `AegisAI_Dummy_Website_Authentication_Logs_100.csv` (SHA-256: `aa2cefc3ef89707ed2820b392c0187630efb6748e67bd29df283a36fae6024e1`).

---

## Supported Ingestion Formats
1. **CSV** (Comma-Separated Values with header)
2. **JSON** (Array of JSON objects)
3. **JSONL** (Newline-Delimited JSON)
4. **XLSX** (Microsoft Excel OpenXML spreadsheet)
5. **XML** (Structured XML event elements)

---

## Dataset Descriptions & Expected Detection Behavior

1. **`dataset-01-normal-auth.csv`** (CSV):
   - **Scenario**: 5 routine successful logins across finance, engineering, HR, and security roles.
   - **Expected Rule Behavior**: `0 threats detected`. All events are normal.
   - **Agent Utility**: Baseline review.

2. **`dataset-02-brute-force.json`** (JSON):
   - **Scenario**: 6 rapid consecutive authentication failures from IP `203.0.113.88` targeting user `admin`.
   - **Expected Rule Behavior**: **Rule 1 (Possible Brute Force Attack)** triggered (`Score: 85/100`, HIGH).
   - **Agent Utility**: Full 4-Agent pipeline (Threat Analysis $\rightarrow$ Incident Summary $\rightarrow$ Risk Assessment $\rightarrow$ Response Recommendation).

3. **`dataset-03-privileged-activity.jsonl`** (JSONL):
   - **Scenario**: 3 consecutive failed logins on the `root` superuser account from IP `198.51.100.50`.
   - **Expected Rule Behavior**: **Rule 5 (Suspicious Privileged Account Activity)** triggered (`Score: 70/100`, HIGH).
   - **Agent Utility**: Investigates superuser targeted probing and recommends credential rotation.

4. **`dataset-04-impossible-travel.xlsx`** (XLSX):
   - **Scenario**: Logins from New York (`40.7128, -74.0060`) and London (`51.5074, -0.1278`) within 30 minutes.
   - **Expected Rule Behavior**: **Rule 4 (Impossible Travel)** triggered (`Score: 80/100`, HIGH, calculated speed $> 11,000\text{ km/h}$).
   - **Agent Utility**: Evaluates session hijack / VPN anomaly and advises multi-factor re-authentication.

5. **`dataset-05-benign-location.xml`** (XML):
   - **Scenario**: Logins from USA and Canada within 20 minutes without coordinate metadata.
   - **Expected Rule Behavior**: `0 threats detected` (Conservative evidence threshold prevents false-positive alerts).
   - **Agent Utility**: Verifies absence of spurious alert noise.

6. **`dataset-06-mixed-authentication.csv`** (CSV):
   - **Scenario**: Mixed benign logins, user typo failures, and 2 suspicious guest attempts.
   - **Expected Rule Behavior**: `0 threats detected` (Fails below detection thresholds).

7. **`dataset-07-api-authentication.json`** (JSON):
   - **Scenario**: Normal service account automated token generation events.
   - **Expected Rule Behavior**: `0 threats detected`.

8. **`dataset-08-enterprise-auth.jsonl`** (JSONL):
   - **Scenario**: Enterprise SSO SAML login verifications across executive and SOC accounts.
   - **Expected Rule Behavior**: `0 threats detected`.

9. **`dataset-09-mixed-security-events.xlsx`** (XLSX):
   - **Scenario**: VPN gateway tunnel connection logs (successful and blocked unauthorized connection).
   - **Expected Rule Behavior**: `0 threats detected` (Single failure is below multi-event threshold).

10. **`dataset-10-coordinate-travel.xml`** (XML):
    - **Scenario**: Logins from San Francisco (`37.7749, -122.4194`) and Tokyo (`35.6762, 139.6503`) within 45 minutes.
    - **Expected Rule Behavior**: **Rule 4 (Impossible Travel)** triggered (`Score: 80/100`, HIGH, $> 11,000\text{ km/h}$).
    - **Agent Utility**: Investigates intercontinental credential reuse and recommends token revocation.

---

## How to Ingest Demonstration Datasets
1. Navigate to **Analyses** $\rightarrow$ Click **+ New Analysis**.
2. Name your analysis (e.g., *"Demonstration Scenario 02"*).
3. Drag & drop any `docs/dataset-*.{csv,json,jsonl,xlsx,xml}` file.
4. Click **Detect Threats** to run the in-memory deterministic engine.
5. Select the detected threat event $\rightarrow$ Click **Run AI Investigation** to invoke the 4-agent pipeline.
