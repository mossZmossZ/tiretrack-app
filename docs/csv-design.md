# TireTrack — CSV Data Design

> **Schema reference for the CSV data layer (Phase 1).**
> This schema will map 1:1 to Google Sheets columns in Phase 2.

---

## 1. Main Service Records Schema

**File**: `server/data/services.csv`

| # | Column Name     | Header (TH)       | Type      | Required | Description |
|---|----------------|--------------------|-----------|----------|-------------|
| 1 | `id`           | รหัส               | String    | Auto     | UUID v4, auto-generated |
| 2 | `date`         | วันที่              | String    | Yes      | Service date `YYYY-MM-DD` |
| 3 | `license_plate`| ทะเบียนรถ          | String    | Yes      | e.g. `กค1220พช` |
| 4 | `province`     | จังหวัด            | String    | No       | Registration province, e.g. `เพชรบูรณ์` |
| 5 | `car_model`    | รุ่นรถ              | String    | No       | e.g. `ดีแม็ค4ประตู`, `วีออส` |
| 6 | `car_color`    | สี                 | String    | No       | e.g. `ดำ`, `ขาว`, `ทอง` |
| 7 | `service_type` | ประเภทบริการ        | Enum      | Yes      | See Service Type Enum below |
| 8 | `quantity`     | จำนวน              | Integer   | Cond.    | Required for `tire_change` (1-6) |
| 9 | `tire_brand`   | ยี่ห้อยาง           | String    | Cond.    | Required for `tire_change` |
| 10| `tire_model`   | รุ่นยาง             | String    | Cond.    | Required for `tire_change` |
| 11| `tire_size`    | ขนาดยาง            | String    | Cond.    | Required for `tire_change`, e.g. `265/70-16` |
| 12| `price_per_unit`| ราคา/เส้น          | Number    | Cond.    | Required for `tire_change` (THB) |
| 13| `total_price`  | ราคารวม             | Number    | Yes      | Total service cost (THB) |
| 14| `technician`   | ช่าง                | String    | No       | Technician name/code |
| 15| `notes`        | หมายเหตุ            | String    | No       | Free text notes |
| 16| `created_at`   | สร้างเมื่อ           | String    | Auto     | ISO 8601 timestamp |
| 17| `created_by`   | สร้างโดย            | Enum      | Auto     | `admin` or `tech` |

### Service Type Enum

| Value            | Label (TH)     | Requires Tire Details |
| ---------------- | -------------- | --------------------- |
| `tire_change`    | เปลี่ยนยาง     | Yes                   |
| `wheel_balance`  | ถ่วงล้อ        | No                    |
| `wheel_alignment`| ตั้งศูนย์ล้อ    | No                    |
| `tire_switch`    | สลับยาง        | No                    |
| `tire_pressure`  | เช็คลมยาง      | No                    |

---

## 2. Sample CSV Data

```csv
id,date,license_plate,province,car_model,car_color,service_type,quantity,tire_brand,tire_model,tire_size,price_per_unit,total_price,technician,notes,created_at,created_by
a1b2c3d4,2015-08-01,กจ1220พช,เพชรบูรณ์,ดีแม็ค4ประตู,ดำ,tire_change,4,ML,LTทัวร์,265/70-16,5500,22000,,,2015-08-01T09:00:00+07:00,admin
e5f6g7h8,2015-08-01,ถอ4539กทม,กรุงเทพมหานคร,เชฟกระบะ,ดำ,tire_change,4,ML,อจิริส,215/70-15,3200,12800,,,2015-08-01T09:15:00+07:00,admin
i9j0k1l2,2015-08-01,กจ2053พช,เพชรบูรณ์,วีออส,ขาว,tire_change,4,GY,Exดูราพลัส,185/60-15,2000,8000,,,2015-08-01T09:30:00+07:00,admin
m3n4o5p6,2015-08-01,ศอ7076กทม,กรุงเทพมหานคร,บิ๊กเอม4ประตู,ทอง,tire_change,4,MS,760,255/70-15,3000,12000,,,2015-08-01T09:45:00+07:00,admin
q7r8s9t0,2015-08-01,1กศ1705กทม,กรุงเทพมหานคร,นิสันอามิร่า,ขาว,tire_change,4,MS,ไอโปร,205/45-17,2400,9600,,,2015-08-01T10:00:00+07:00,admin
u1v2w3x4,2015-08-01,,ไม่ระบุ,ดีแม็ค,บอรน์,tire_change,2,MS,Z1,225/55-17,2700,5400,,,2015-08-01T10:15:00+07:00,admin
y5z6a7b8,2024-03-15,กค1234กทม,กรุงเทพมหานคร,ฮอนด้าซีวิค,ขาว,wheel_balance,,,,,500,,ถ่วงล้อ 4 ล้อ,2024-03-15T14:00:00+07:00,tech
c9d0e1f2,2024-03-15,กค1234กทม,กรุงเทพมหานคร,ฮอนด้าซีวิค,ขาว,tire_pressure,,,,,0,,เช็คลม OK,2024-03-15T14:10:00+07:00,tech
```

---

## 3. Legacy Data Mapping

The existing Google Sheet uses this format:

```
วันที่ | ทะเบียนรถ | รถรุ่น | สี | เปลี่ยนยาง | ยางยี่ห้อ | รุ่น | ขนาดยาง | ราคา/เส้น | หมายเหตุ
```

### Mapping Rules (Legacy → TireTrack CSV)

| Legacy Column    | Maps To             | Transform                                        |
| ---------------- | ------------------- | ------------------------------------------------ |
| วันที่            | `date`              | Parse `D/M/YYYY` → `YYYY-MM-DD`                |
| ทะเบียนรถ        | `license_plate`     | Direct copy, trim whitespace                     |
| *(from plate suffix)* | `province`     | Extract province abbreviation (พช→เพชรบูรณ์, กทม→กรุงเทพมหานคร) |
| รถรุ่น            | `car_model`         | Direct copy                                      |
| สี               | `car_color`         | Direct copy                                      |
| *(always)*       | `service_type`      | Always `tire_change` (legacy only has this)       |
| เปลี่ยนยาง       | `quantity`          | Parse integer                                    |
| ยางยี่ห้อ         | `tire_brand`        | Direct copy (ML, GY, MS, etc.)                   |
| รุ่น              | `tire_model`        | Direct copy                                      |
| ขนาดยาง          | `tire_size`         | Direct copy                                      |
| ราคา/เส้น        | `price_per_unit`    | Remove `,` and `฿`, parse as number              |
| *(calculated)*   | `total_price`       | `quantity × price_per_unit`                       |
| หมายเหตุ         | `notes`             | Direct copy                                      |
| *(auto)*         | `id`                | Generate UUID                                    |
| *(auto)*         | `created_at`        | Use `date` + `T00:00:00+07:00`                   |
| *(auto)*         | `created_by`        | Always `admin` (imported data)                    |
| *(empty)*        | `technician`        | Empty (not in legacy data)                        |

### Brand Code Reference

| Code | Full Name          |
| ---- | ------------------ |
| ML   | Maxxis             |
| GY   | Goodyear           |
| MS   | Maxxis (alternate) |
| BS   | Bridgestone        |
| MC   | Michelin           |
| DL   | Dunlop             |
| YK   | Yokohama           |

> **Note**: Brand codes may need CEO verification for accuracy.

---

## 4. Dropdown Options for Technician Input

To minimize typing on mobile, the app provides predefined dropdown options:

### Tire Brands (ยี่ห้อยาง)

```json
[
  { "code": "MC", "label": "Michelin" },
  { "code": "BS", "label": "Bridgestone" },
  { "code": "GY", "label": "Goodyear" },
  { "code": "ML", "label": "Maxxis" },
  { "code": "DL", "label": "Dunlop" },
  { "code": "YK", "label": "Yokohama" },
  { "code": "TY", "label": "Toyo" },
  { "code": "OT", "label": "อื่นๆ (Other)" }
]
```

### Common Tire Sizes (ขนาดยาง)

```json
[
  "175/65-14", "185/60-15", "185/65-15",
  "195/55-15", "195/60-15", "195/65-15",
  "205/45-17", "205/55-16", "205/60-16",
  "215/50-17", "215/55-17", "215/60-16", "215/70-15",
  "225/45-17", "225/55-17", "225/65-17",
  "235/55-18", "235/60-18",
  "245/45-18",
  "255/70-15",
  "265/65-17", "265/70-16"
]
```

### Car Colors (สี)

```json
["ดำ", "ขาว", "เทา", "เงิน", "แดง", "น้ำเงิน", "ทอง", "น้ำตาล", "เขียว", "ส้ม", "อื่นๆ"]
```

### Provinces (จังหวัด) — Top used

```json
["กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "เพชรบูรณ์", "นครราชสีมา", "ชลบุรี", "อื่นๆ"]
```

> **Note**: All dropdowns allow free-text input as fallback (combobox pattern).

---

## 5. Google Sheets Mapping (Phase 2)

When migrating to Google Sheets:

- **Sheet Name**: `ServiceRecords`
- **Row 1**: Header row matching CSV column names
- **Columns**: Identical to CSV schema (A=id through Q=created_by)
- **API**: Google Sheets API v4 with Service Account
- **Sync**: Write-through (every CSV write also writes to Sheet)
- **Fallback**: If API fails, CSV write succeeds, queue Sheet sync for retry

---

*Last updated: 2026-04-17*
