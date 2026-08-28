import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

const docsDir = path.join(process.cwd(), '..', 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// 1. docs/dataset-01-normal-auth.csv
const d1 = [
  'timestamp,event_id,username,role,ip_address,country,user_agent,method,endpoint,status_code,login_result,failed_attempts,session_id,risk_level,threat_label',
  '2026-08-15 08:00:00,EVT-0101,sarah_finance,Finance,198.51.100.10,USA,Chrome Windows,POST,/login,200,SUCCESS,0,SID-901121,Low,Normal Activity',
  '2026-08-15 08:05:00,EVT-0102,david_eng,Engineer,198.51.100.11,USA,Firefox Mac,POST,/login,200,SUCCESS,0,SID-901122,Low,Normal Activity',
  '2026-08-15 08:10:00,EVT-0103,elena_hr,HR,198.51.100.12,Canada,Safari iOS,POST,/login,200,SUCCESS,0,SID-901123,Low,Normal Activity',
  '2026-08-15 08:15:00,EVT-0104,marcus_dev,Developer,198.51.100.13,Germany,Chrome Linux,POST,/login,200,SUCCESS,0,SID-901124,Low,Normal Activity',
  '2026-08-15 08:20:00,EVT-0105,rachel_sec,Security,198.51.100.14,USA,Edge Windows,POST,/login,200,SUCCESS,0,SID-901125,Low,Normal Activity',
].join('\n');
fs.writeFileSync(path.join(docsDir, 'dataset-01-normal-auth.csv'), d1);

// 2. docs/dataset-02-brute-force.json
const d2 = [
  { timestamp: '2026-08-15 09:00:00', event_id: 'EVT-0201', username: 'admin', role: 'Administrator', ip_address: '203.0.113.88', country: 'Russia', user_agent: 'Python-requests/2.28', method: 'POST', endpoint: '/login', status_code: 401, login_result: 'FAILED', failed_attempts: 1, session_id: 'SID-0201', risk_level: 'High', threat_label: 'Brute Force' },
  { timestamp: '2026-08-15 09:00:40', event_id: 'EVT-0202', username: 'admin', role: 'Administrator', ip_address: '203.0.113.88', country: 'Russia', user_agent: 'Python-requests/2.28', method: 'POST', endpoint: '/login', status_code: 401, login_result: 'FAILED', failed_attempts: 2, session_id: 'SID-0202', risk_level: 'High', threat_label: 'Brute Force' },
  { timestamp: '2026-08-15 09:01:20', event_id: 'EVT-0203', username: 'admin', role: 'Administrator', ip_address: '203.0.113.88', country: 'Russia', user_agent: 'Python-requests/2.28', method: 'POST', endpoint: '/login', status_code: 401, login_result: 'FAILED', failed_attempts: 3, session_id: 'SID-0203', risk_level: 'High', threat_label: 'Brute Force' },
  { timestamp: '2026-08-15 09:02:00', event_id: 'EVT-0204', username: 'admin', role: 'Administrator', ip_address: '203.0.113.88', country: 'Russia', user_agent: 'Python-requests/2.28', method: 'POST', endpoint: '/login', status_code: 401, login_result: 'FAILED', failed_attempts: 4, session_id: 'SID-0204', risk_level: 'High', threat_label: 'Brute Force' },
  { timestamp: '2026-08-15 09:02:40', event_id: 'EVT-0205', username: 'admin', role: 'Administrator', ip_address: '203.0.113.88', country: 'Russia', user_agent: 'Python-requests/2.28', method: 'POST', endpoint: '/login', status_code: 401, login_result: 'FAILED', failed_attempts: 5, session_id: 'SID-0205', risk_level: 'High', threat_label: 'Brute Force' },
  { timestamp: '2026-08-15 09:03:20', event_id: 'EVT-0206', username: 'admin', role: 'Administrator', ip_address: '203.0.113.88', country: 'Russia', user_agent: 'Python-requests/2.28', method: 'POST', endpoint: '/login', status_code: 401, login_result: 'FAILED', failed_attempts: 6, session_id: 'SID-0206', risk_level: 'High', threat_label: 'Brute Force' },
];
fs.writeFileSync(path.join(docsDir, 'dataset-02-brute-force.json'), JSON.stringify(d2, null, 2));

// 3. docs/dataset-03-privileged-activity.jsonl
const d3 = [
  { timestamp: '2026-08-15 10:00:00', event_id: 'EVT-0301', username: 'root', role: 'Superuser', ip_address: '198.51.100.50', country: 'Netherlands', user_agent: 'Curl/7.88', method: 'POST', endpoint: '/api/v1/auth', status_code: 401, login_result: 'FAILED', failed_attempts: 1, session_id: 'SID-0301', risk_level: 'Medium', threat_label: 'Privileged Probe' },
  { timestamp: '2026-08-15 10:01:30', event_id: 'EVT-0302', username: 'root', role: 'Superuser', ip_address: '198.51.100.50', country: 'Netherlands', user_agent: 'Curl/7.88', method: 'POST', endpoint: '/api/v1/auth', status_code: 401, login_result: 'FAILED', failed_attempts: 2, session_id: 'SID-0302', risk_level: 'Medium', threat_label: 'Privileged Probe' },
  { timestamp: '2026-08-15 10:03:00', event_id: 'EVT-0303', username: 'root', role: 'Superuser', ip_address: '198.51.100.50', country: 'Netherlands', user_agent: 'Curl/7.88', method: 'POST', endpoint: '/api/v1/auth', status_code: 401, login_result: 'FAILED', failed_attempts: 3, session_id: 'SID-0303', risk_level: 'High', threat_label: 'Suspicious Privileged Activity' },
];
fs.writeFileSync(path.join(docsDir, 'dataset-03-privileged-activity.jsonl'), d3.map(x => JSON.stringify(x)).join('\n'));

// 4. docs/dataset-04-impossible-travel.xlsx
const d4 = [
  { timestamp: '2026-08-15 11:00:00', event_id: 'EVT-0401', username: 'alice_exec', role: 'Executive', ip_address: '198.51.100.20', country: 'USA', latitude: 40.7128, longitude: -74.0060, user_agent: 'Safari Mac', method: 'POST', endpoint: '/login', status_code: 200, login_result: 'SUCCESS', failed_attempts: 0, session_id: 'SID-0401', risk_level: 'Low', threat_label: 'Normal Login' },
  { timestamp: '2026-08-15 11:30:00', event_id: 'EVT-0402', username: 'alice_exec', role: 'Executive', ip_address: '203.0.113.40', country: 'UK', latitude: 51.5074, longitude: -0.1278, user_agent: 'Chrome Windows', method: 'POST', endpoint: '/login', status_code: 200, login_result: 'SUCCESS', failed_attempts: 0, session_id: 'SID-0402', risk_level: 'Critical', threat_label: 'Impossible Travel' },
];
const ws4 = xlsx.utils.json_to_sheet(d4);
const wb4 = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb4, ws4, 'Logs');
xlsx.writeFile(wb4, path.join(docsDir, 'dataset-04-impossible-travel.xlsx'));

// 5. docs/dataset-05-benign-location.xml
const d5 = `<?xml version="1.0" encoding="UTF-8"?>
<events>
  <event>
    <timestamp>2026-08-15 12:00:00</timestamp>
    <event_id>EVT-0501</event_id>
    <username>bob_sales</username>
    <role>Sales</role>
    <ip_address>198.51.100.70</ip_address>
    <country>USA</country>
    <user_agent>Edge Windows</user_agent>
    <method>POST</method>
    <endpoint>/login</endpoint>
    <status_code>200</status_code>
    <login_result>SUCCESS</login_result>
    <failed_attempts>0</failed_attempts>
    <session_id>SID-0501</session_id>
    <risk_level>Low</risk_level>
    <threat_label>Normal Login</threat_label>
  </event>
  <event>
    <timestamp>2026-08-15 12:20:00</timestamp>
    <event_id>EVT-0502</event_id>
    <username>bob_sales</username>
    <role>Sales</role>
    <ip_address>198.51.100.75</ip_address>
    <country>Canada</country>
    <user_agent>Chrome Android</user_agent>
    <method>POST</method>
    <endpoint>/login</endpoint>
    <status_code>200</status_code>
    <login_result>SUCCESS</login_result>
    <failed_attempts>0</failed_attempts>
    <session_id>SID-0502</session_id>
    <risk_level>Low</risk_level>
    <threat_label>Normal Login (No Coordinates)</threat_label>
  </event>
</events>`;
fs.writeFileSync(path.join(docsDir, 'dataset-05-benign-location.xml'), d5);

// 6. docs/dataset-06-mixed-authentication.csv
const d6 = [
  'timestamp,event_id,username,role,ip_address,country,user_agent,method,endpoint,status_code,login_result,failed_attempts,session_id,risk_level,threat_label',
  '2026-08-15 13:00:00,EVT-0601,user1,User,198.51.100.1,USA,Chrome Windows,POST,/login,200,SUCCESS,0,SID-0601,Low,Normal',
  '2026-08-15 13:02:00,EVT-0602,user2,User,198.51.100.2,USA,Firefox Mac,POST,/login,401,FAILED,1,SID-0602,Low,Typo',
  '2026-08-15 13:03:00,EVT-0603,user2,User,198.51.100.2,USA,Firefox Mac,POST,/login,200,SUCCESS,0,SID-0603,Low,Normal',
  '2026-08-15 13:05:00,EVT-0604,attacker,Guest,203.0.113.99,Brazil,Python,POST,/login,401,FAILED,1,SID-0604,Medium,Suspicious',
  '2026-08-15 13:05:30,EVT-0605,attacker,Guest,203.0.113.99,Brazil,Python,POST,/login,401,FAILED,2,SID-0605,Medium,Suspicious',
].join('\n');
fs.writeFileSync(path.join(docsDir, 'dataset-06-mixed-authentication.csv'), d6);

// 7. docs/dataset-07-api-authentication.json
const d7 = [
  { timestamp: '2026-08-15 14:00:00', event_id: 'EVT-0701', username: 'api_service_billing', role: 'ServiceAccount', ip_address: '198.51.100.100', country: 'USA', user_agent: 'Go-http-client/1.1', method: 'POST', endpoint: '/api/v1/tokens', status_code: 200, login_result: 'SUCCESS', failed_attempts: 0, session_id: 'SID-0701', risk_level: 'Low', threat_label: 'API Token Issue' },
  { timestamp: '2026-08-15 14:05:00', event_id: 'EVT-0702', username: 'api_service_shipping', role: 'ServiceAccount', ip_address: '198.51.100.101', country: 'USA', user_agent: 'Node-Fetch/3.0', method: 'POST', endpoint: '/api/v1/tokens', status_code: 200, login_result: 'SUCCESS', failed_attempts: 0, session_id: 'SID-0702', risk_level: 'Low', threat_label: 'API Token Issue' },
];
fs.writeFileSync(path.join(docsDir, 'dataset-07-api-authentication.json'), JSON.stringify(d7, null, 2));

// 8. docs/dataset-08-enterprise-auth.jsonl
const d8 = [
  { timestamp: '2026-08-15 15:00:00', event_id: 'EVT-0801', username: 'ciso_office', role: 'Executive', ip_address: '198.51.100.200', country: 'USA', user_agent: 'OktaVerify/4.2', method: 'POST', endpoint: '/saml/sso', status_code: 200, login_result: 'SUCCESS', failed_attempts: 0, session_id: 'SID-0801', risk_level: 'Low', threat_label: 'SSO Login' },
  { timestamp: '2026-08-15 15:10:00', event_id: 'EVT-0802', username: 'soc_analyst1', role: 'Security', ip_address: '198.51.100.201', country: 'USA', user_agent: 'OktaVerify/4.2', method: 'POST', endpoint: '/saml/sso', status_code: 200, login_result: 'SUCCESS', failed_attempts: 0, session_id: 'SID-0802', risk_level: 'Low', threat_label: 'SSO Login' },
];
fs.writeFileSync(path.join(docsDir, 'dataset-08-enterprise-auth.jsonl'), d8.map(x => JSON.stringify(x)).join('\n'));

// 9. docs/dataset-09-mixed-security-events.xlsx
const d9 = [
  { timestamp: '2026-08-15 16:00:00', event_id: 'EVT-0901', username: 'vpn_gateway', role: 'Gateway', ip_address: '198.51.100.250', country: 'USA', user_agent: 'OpenVPN/2.6', method: 'CONNECT', endpoint: '/vpn', status_code: 200, login_result: 'SUCCESS', failed_attempts: 0, session_id: 'SID-0901', risk_level: 'Low', threat_label: 'Tunnel Established' },
  { timestamp: '2026-08-15 16:05:00', event_id: 'EVT-0902', username: 'vpn_gateway', role: 'Gateway', ip_address: '203.0.113.111', country: 'China', user_agent: 'UnknownClient', method: 'CONNECT', endpoint: '/vpn', status_code: 403, login_result: 'FAILED', failed_attempts: 1, session_id: 'SID-0902', risk_level: 'Medium', threat_label: 'Tunnel Rejected' },
];
const ws9 = xlsx.utils.json_to_sheet(d9);
const wb9 = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb9, ws9, 'Logs');
xlsx.writeFile(wb9, path.join(docsDir, 'dataset-09-mixed-security-events.xlsx'));

// 10. docs/dataset-10-coordinate-travel.xml
const d10 = `<?xml version="1.0" encoding="UTF-8"?>
<events>
  <event>
    <timestamp>2026-08-15 17:00:00</timestamp>
    <event_id>EVT-1001</event_id>
    <username>travel_analyst</username>
    <role>Analyst</role>
    <ip_address>198.51.100.15</ip_address>
    <country>USA</country>
    <latitude>37.7749</latitude>
    <longitude>-122.4194</longitude>
    <user_agent>Chrome Mac</user_agent>
    <method>POST</method>
    <endpoint>/login</endpoint>
    <status_code>200</status_code>
    <login_result>SUCCESS</login_result>
    <failed_attempts>0</failed_attempts>
    <session_id>SID-1001</session_id>
    <risk_level>Low</risk_level>
    <threat_label>San Francisco Login</threat_label>
  </event>
  <event>
    <timestamp>2026-08-15 17:45:00</timestamp>
    <event_id>EVT-1002</event_id>
    <username>travel_analyst</username>
    <role>Analyst</role>
    <ip_address>203.0.113.22</ip_address>
    <country>Japan</country>
    <latitude>35.6762</latitude>
    <longitude>139.6503</longitude>
    <user_agent>Firefox Linux</user_agent>
    <method>POST</method>
    <endpoint>/login</endpoint>
    <status_code>200</status_code>
    <login_result>SUCCESS</login_result>
    <failed_attempts>0</failed_attempts>
    <session_id>SID-1002</session_id>
    <risk_level>Critical</risk_level>
    <threat_label>Tokyo Login (Impossible Speed)</threat_label>
  </event>
</events>`;
fs.writeFileSync(path.join(docsDir, 'dataset-10-coordinate-travel.xml'), d10);

console.log('Successfully created all 10 demonstration datasets in docs/');
