# SkillQuest Compliance & Data Governance

> Regulatory compliance, data classification, retention policies, and incident response procedures.

---

## Table of Contents

1. [GDPR Compliance](#gdpr-compliance)
2. [China PIPL Compliance](#china-pipl-compliance)
3. [SOC 2 Readiness](#soc-2-readiness)
4. [Data Classification](#data-classification)
5. [Data Retention Policy](#data-retention-policy)
6. [Incident Response Plan](#incident-response-plan)
7. [Third-Party Data Processing](#third-party-data-processing)
8. [Compliance Monitoring](#compliance-monitoring)

---

## GDPR Compliance

The General Data Protection Regulation (EU 2016/679) applies when processing personal data of individuals in the European Economic Area (EEA).

### Legal Basis for Processing

| Processing Activity            | Legal Basis              | GDPR Article |
| ------------------------------ | ------------------------ | ------------ |
| User account creation          | Contractual necessity    | Art. 6(1)(b) |
| Learning progress tracking     | Contractual necessity    | Art. 6(1)(b) |
| AI-powered recommendations     | Legitimate interest      | Art. 6(1)(f) |
| Analytics and reporting        | Legitimate interest      | Art. 6(1)(f) |
| Marketing communications       | Consent                  | Art. 6(1)(a) |
| Legal compliance (audit logs)  | Legal obligation         | Art. 6(1)(c) |

### Data Subject Rights

SkillQuest implements all GDPR data subject rights through the admin panel and API.

#### Right to Access (Art. 15)

Users can request a complete export of their personal data.

```
GET /api/v1/users/me/data-export
Authorization: Bearer <token>
```

Response: A JSON file containing all personal data, delivered within 30 days.

**Exported Data Includes**:
- Profile information (name, email, avatar)
- Learning history and assessment results
- Course enrollments and progress
- Generated AI content linked to the user
- Audit logs of user actions
- SSO identity mappings

#### Right to Erasure (Art. 17)

Users can request deletion of their personal data ("Right to be Forgotten").

```
DELETE /api/v1/users/me/data
Authorization: Bearer <token>
```

**Deletion Process**:
1. User submits deletion request via the platform or by contacting the DPO.
2. Identity is verified via password confirmation or admin approval.
3. Account is immediately **soft-deleted** (deactivated).
4. After a 30-day grace period, all personal data is **hard-deleted**.
5. Anonymized analytics data is retained (no personal identifiers).
6. Audit logs referencing the user are anonymized (user ID replaced with hash).
7. Confirmation email sent to the user upon completion.

**Exceptions**: Data required for legal obligations (e.g., financial records) is retained per applicable law.

#### Right to Data Portability (Art. 20)

Users can export their data in machine-readable format (JSON or CSV).

```
GET /api/v1/users/me/data-export?format=json
GET /api/v1/users/me/data-export?format=csv
```

#### Right to Rectification (Art. 16)

Users can update incorrect personal data through profile settings or by contacting support.

#### Right to Object (Art. 21)

Users can opt out of AI-powered recommendations and analytics via privacy settings.

### Data Protection Officer (DPO)

| Field           | Value                          |
| --------------- | ------------------------------ |
| Name            | Designated DPO                 |
| Email           | dpo@skillquest.example.com     |
| Response SLA    | 72 hours                       |

---

## China PIPL Compliance

The Personal Information Protection Law (PIPL) of the People's Republic of China applies when processing personal information of individuals in China.

### Legal Basis for Processing

| Processing Activity            | Legal Basis (PIPL Art.)  | Notes                            |
| ------------------------------ | ------------------------ | -------------------------------- |
| User registration              | Consent (Art. 13)        | Explicit consent required        |
| WeChat Work SSO                | Contractual (Art. 13)    | Necessary for service delivery   |
| Learning analytics             | Consent (Art. 13)        | Separate consent required        |
| Cross-border data transfer     | Consent + Assessment     | Standard contract or certification|

### Consent Requirements

- **Separate consent** must be obtained for each processing purpose.
- Consent must be **informed, voluntary, and explicit**.
- Users must be able to **withdraw consent** at any time.
- Consent records must be maintained for the duration of processing.

```typescript
// Consent management schema (Prisma)
model UserConsent {
  id          String   @id @default(cuid())
  userId      String
  purpose     String   // e.g., "analytics", "ai_recommendations", "marketing"
  granted     Boolean
  grantedAt   DateTime?
  revokedAt   DateTime?
  version     String   // Consent policy version
  ipAddress   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
}
```

### Data Localization

- Personal data of Chinese users **must be stored** on servers located within mainland China.
- Cross-border data transfer requires:
  1. Security assessment by the Cyberspace Administration of China (CAC), **or**
  2. Personal information protection certification, **or**
  3. Standard contractual clauses.

### Deployment Topology for China Compliance

```
┌─────────────────────────────────────┐
│        China Region (Mainland)       │
│  ┌────────┐  ┌────────┐  ┌───────┐  │
│  │  API   │  │  Web   │  │  AI   │  │
│  └───┬────┘  └────────┘  └───────┘  │
│      │                               │
│  ┌───▼──────┐  ┌──────────┐         │
│  │PostgreSQL│  │  Redis   │          │
│  └──────────┘  └──────────┘         │
└─────────────────────────────────────┘
         │ (no PII transfer)
         ▼
┌─────────────────────────────────────┐
│       Global Region (Analytics)      │
│  Anonymized/aggregated data only     │
└─────────────────────────────────────┘
```

---

## SOC 2 Readiness

SOC 2 Type II readiness checklist based on the Trust Services Criteria (TSC).

### Security (Common Criteria)

| Control ID | Control Description                         | Status    | Evidence                        |
| ---------- | ------------------------------------------- | --------- | ------------------------------- |
| CC1.1      | Control environment established              | ☐ Ready   | Security policies documented    |
| CC2.1      | Information communicated internally          | ☐ Ready   | Employee handbook, training     |
| CC3.1      | Risk assessment performed                    | ☐ Ready   | Annual risk assessment report   |
| CC4.1      | Monitoring activities established            | ☐ Ready   | Prometheus/Grafana dashboards   |
| CC5.1      | Control activities selected                  | ☐ Ready   | RBAC, encryption, audit logs    |
| CC6.1      | Logical access controls implemented          | ☐ Ready   | JWT, RBAC, MFA                  |
| CC6.2      | Access provisioning and de-provisioning      | ☐ Ready   | SSO integration, offboarding    |
| CC6.3      | Access modification                          | ☐ Ready   | Role change audit trail         |
| CC7.1      | System monitoring for anomalies              | ☐ Ready   | Alerting rules, log analysis    |
| CC7.2      | Incident response procedures                 | ☐ Ready   | IR plan documented              |
| CC8.1      | Change management processes                  | ☐ Ready   | Git workflow, PR reviews        |
| CC9.1      | Risk mitigation activities                   | ☐ Ready   | Dependency scanning, pen tests  |

### Availability

| Control    | Description                                  | Status    |
| ---------- | -------------------------------------------- | --------- |
| A1.1       | System availability commitments              | ☐ Ready   |
| A1.2       | Environmental protections                    | ☐ Ready   |
| A1.3       | Recovery procedures and testing              | ☐ Ready   |

### Confidentiality

| Control    | Description                                  | Status    |
| ---------- | -------------------------------------------- | --------- |
| C1.1       | Confidential information identified          | ☐ Ready   |
| C1.2       | Confidential information disposed of         | ☐ Ready   |

### Processing Integrity

| Control    | Description                                  | Status    |
| ---------- | -------------------------------------------- | --------- |
| PI1.1      | Processing quality objectives defined        | ☐ Ready   |
| PI1.2      | System inputs validated                      | ☐ Ready   |

---

## Data Classification

### Classification Levels

| Level           | Definition                                          | Examples                              | Handling Requirements                  |
| --------------- | --------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| **Public**      | Information intended for public disclosure           | Marketing content, public course catalog, blog posts | No restrictions                |
| **Internal**    | General business information not for public release  | Usernames, email addresses, course content, internal metrics | Authentication required, TLS in transit |
| **Confidential**| Sensitive information requiring protection           | Password hashes, API keys, SSO tokens, assessment answers | Encrypted at rest, access logging, need-to-know |
| **Restricted**  | Highly sensitive information with legal implications | Government IDs, payment data, health records (if applicable) | AES-256 encryption, separate storage, DPO approval, audit trail |

### Classification by Data Category

| Data Category              | Classification  | Owner            | Retention       |
| -------------------------- | --------------- | ---------------- | --------------- |
| User profile (name, email) | Internal        | User / DPO       | Account lifetime|
| Authentication credentials | Confidential    | Security team    | Account lifetime|
| Learning progress          | Internal        | User / Trainer   | 3 years         |
| Assessment results         | Internal        | Trainer / Admin  | 5 years         |
| AI-generated content       | Internal        | Platform         | 2 years         |
| Audit logs                 | Confidential    | Security team    | 90 days online, 7 years archive |
| System configuration       | Confidential    | DevOps team      | Current version |
| Financial/billing data     | Restricted      | Finance team     | 7 years         |
| SSO tokens                 | Confidential    | System           | Session lifetime|
| Analytics (anonymized)     | Internal        | Product team     | 3 years         |

---

## Data Retention Policy

### Retention Schedule

| Data Type                  | Active Retention | Archive Retention | Deletion Method          |
| -------------------------- | ---------------- | ----------------- | ------------------------ |
| User accounts (active)     | Indefinite       | N/A               | N/A                      |
| User accounts (inactive)   | 1 year           | 2 years           | Hard delete + backups    |
| User accounts (deleted)    | 30 days          | N/A               | Hard delete              |
| Learning progress          | 3 years          | 2 years           | Anonymize then delete    |
| Assessment results         | 5 years          | 2 years           | Anonymize then delete    |
| AI generation history      | 2 years          | 1 year            | Hard delete              |
| Audit logs                 | 90 days          | 7 years           | Archive to cold storage  |
| Application logs           | 30 days          | N/A               | Auto-delete (ELK/Loki)  |
| Database backups           | 30 days          | 90 days           | Auto-rotate              |
| Session data               | 24 hours         | N/A               | Auto-expire (Redis TTL)  |

### Automated Retention Enforcement

```typescript
// Scheduled retention job (runs daily at 04:00 UTC)
@Cron('0 4 * * *')
async enforceRetentionPolicy() {
  // Hard-delete soft-deleted accounts older than 30 days
  await this.prisma.user.deleteMany({
    where: {
      deletedAt: { lt: subDays(new Date(), 30) },
    },
  });

  // Anonymize learning records older than 3 years
  await this.prisma.learningProgress.updateMany({
    where: {
      createdAt: { lt: subYears(new Date(), 3) },
      anonymized: false,
    },
    data: {
      userId: 'ANONYMIZED',
      anonymized: true,
    },
  });

  // Delete old AI generation logs
  await this.prisma.aiGenerationLog.deleteMany({
    where: {
      createdAt: { lt: subYears(new Date(), 2) },
    },
  });
}
```

---

## Incident Response Plan

### Incident Classification

| Severity | Description                                         | Examples                                  | Response SLA |
| -------- | --------------------------------------------------- | ----------------------------------------- | ------------ |
| **P1**   | Critical: Active data breach or system compromise    | Unauthorized data access, ransomware      | 15 min       |
| **P2**   | High: Potential breach or serious vulnerability      | Credential leak, exploited vulnerability  | 1 hour       |
| **P3**   | Medium: Security anomaly requiring investigation     | Suspicious login patterns, failed attacks | 4 hours      |
| **P4**   | Low: Minor security improvement needed               | Outdated dependency, policy violation     | Next sprint  |

### Response Phases

#### Phase 1: Detection and Reporting (0–15 minutes)

1. Alert received via monitoring, user report, or automated detection.
2. On-call engineer acknowledges and begins assessment.
3. Incident ticket created with initial classification.

#### Phase 2: Containment (15–60 minutes)

1. **Isolate** affected systems (network segmentation, disable accounts).
2. **Preserve** evidence (logs, memory dumps, disk images).
3. **Block** attack vectors (IP bans, disable compromised APIs).

```bash
# Emergency containment commands
# Block suspicious IP at Nginx level
echo "deny 203.0.113.50;" >> /etc/nginx/conf.d/blocklist.conf
nginx -s reload

# Disable compromised user account
curl -X PATCH https://api.skillquest.example.com/admin/users/usr_abc123 \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"status": "SUSPENDED"}'
```

#### Phase 3: Investigation (1–24 hours)

1. **Analyze** audit logs and access patterns.
2. **Determine** scope: which data, which users, what timeframe.
3. **Identify** root cause and attack vector.
4. **Document** all findings in the incident ticket.

#### Phase 4: Eradication and Recovery (24–72 hours)

1. **Patch** the vulnerability or close the attack vector.
2. **Reset** compromised credentials.
3. **Restore** affected systems from clean backups.
4. **Verify** system integrity before restoring service.

#### Phase 5: Notification (within 72 hours)

| Audience                  | Notification Requirement                 | Timeline     |
| ------------------------- | ---------------------------------------- | ------------ |
| Data Protection Authority | GDPR Art. 33 (if PII breach)            | 72 hours     |
| Affected Users            | GDPR Art. 34 (if high risk to rights)   | Without delay|
| CAC (China)               | PIPL Art. 57 (if China data involved)   | Immediately  |
| Internal Stakeholders     | Executive briefing                       | 24 hours     |

#### Phase 6: Post-Incident Review (1–2 weeks)

1. Conduct a **blameless post-mortem**.
2. Document **timeline, root cause, impact, and remediation**.
3. Identify **process improvements** and assign action items.
4. Update **runbooks and alerting rules** based on lessons learned.
5. Share findings with the broader engineering team.

---

## Third-Party Data Processing

### Sub-Processors

| Vendor            | Service                | Data Processed        | Location      | DPA Signed |
| ----------------- | ---------------------- | --------------------- | ------------- | ---------- |
| OpenAI            | AI question generation | Course content (no PII) | US          | ☐ Yes      |
| Cloud Provider    | Infrastructure hosting | All data              | Region-specific | ☐ Yes   |
| SendGrid/Mailgun  | Transactional email   | Email addresses       | US/EU         | ☐ Yes      |
| Sentry            | Error tracking         | Error context (no PII)| US/EU         | ☐ Yes      |

### Data Processing Agreements (DPAs)

All sub-processors must sign a Data Processing Agreement that includes:
- Purpose limitation for data processing.
- Technical and organizational security measures.
- Sub-processor notification requirements.
- Data breach notification within 24 hours.
- Data deletion upon contract termination.

---

## Compliance Monitoring

### Automated Compliance Checks

| Check                              | Frequency  | Tool           | Alert On Failure |
| ---------------------------------- | ---------- | -------------- | ---------------- |
| PII in application logs            | Continuous | Log analyzer   | Immediate        |
| Encryption at rest enabled         | Daily      | Infrastructure | P2 alert         |
| Access control audit               | Weekly     | RBAC validator | P3 alert         |
| Dependency vulnerability scan      | Daily      | pnpm audit     | P2/P3 based on severity |
| Backup integrity verification      | Weekly     | Restore test   | P2 alert         |
| Certificate expiration             | Daily      | Cert monitor   | 30 days warning  |
| Data retention policy enforcement  | Daily      | Cron job       | P3 alert         |

### Compliance Reporting

| Report                          | Audience              | Frequency  |
| ------------------------------- | --------------------- | ---------- |
| Security posture summary        | CTO / CISO            | Monthly    |
| Data protection impact assessment| DPO                  | Annually   |
| SOC 2 readiness report          | Auditors              | Annually   |
| Incident summary report         | Management            | Quarterly  |
| Data subject request log        | DPO                   | Monthly    |
