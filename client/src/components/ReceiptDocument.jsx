import { TIRE_BRANDS, SERVICE_TYPE_MAP } from '../utils/constants.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export function ReceiptDocument({ config, data, receiptNumber }) {
  const total = Number(data.total_price || 0);
  const vatAmount = config.vat_registered ? Math.round(total * 7 / 107) : 0;
  const subtotal = total - vatAmount;

  const brandLabel = TIRE_BRANDS.find(b => b.code === data.tire_brand)?.label || data.tire_brand || '';
  const serviceLabel = SERVICE_TYPE_MAP[data.service_type]?.label || data.service_type || '';
  const isTireChange = data.service_type === 'tire_change';

  const lineStyle = { borderTop: '1px dashed #555', margin: '6px 0' };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' };

  return (
    <div
      id="receipt-to-print"
      style={{
        width: '72mm',
        fontFamily: "'Sarabun', 'Courier New', monospace",
        fontSize: '11px',
        lineHeight: '1.6',
        color: '#000',
        background: '#fff',
        padding: '4mm 4mm',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Shop Header */}
      <div style={{ textAlign: 'center', marginBottom: '2px' }}>
        <div style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '0.5px', fontFamily: 'sans-serif' }}>
          {config.shop_name || 'ชื่อร้าน'}
        </div>
        {config.address && (
          <div style={{ fontSize: '10px', marginTop: '1px', lineHeight: '1.4' }}>{config.address}</div>
        )}
        {config.tax_id ? (
          <div style={{ fontSize: '10px' }}>
            เลขประจำตัวผู้เสียภาษี: <b>{config.tax_id}</b>
          </div>
        ) : (
          <div style={{ fontSize: '10px', color: '#888' }}>(ยังไม่ได้กำหนดเลขผู้เสียภาษี)</div>
        )}
      </div>

      <div style={lineStyle} />

      {/* Invoice Type */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px' }}>
          ใบกำกับภาษีอย่างย่อ
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
        <span>เลขที่: {receiptNumber || 'DRAFT'}</span>
        <span>วันที่: {formatDate(data.date)}</span>
      </div>

      <div style={lineStyle} />

      {/* Items */}
      <div style={{ ...rowStyle, fontWeight: 'bold', marginBottom: '4px' }}>
        <span>รายการ</span>
        <span>ราคา</span>
      </div>

      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: '600' }}>{serviceLabel}</div>

        {isTireChange && (
          <>
            <div style={{ fontSize: '10px', color: '#333' }}>
              {[brandLabel, data.tire_model, data.tire_size].filter(Boolean).join(' / ')}
            </div>
            <div style={{ ...rowStyle }}>
              <span style={{ fontSize: '10px' }}>
                {formatCurrency(data.price_per_unit)} × {data.quantity} เส้น
              </span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(subtotal)}</span>
            </div>
          </>
        )}

        {!isTireChange && (
          <div style={{ ...rowStyle }}>
            <span />
            <span style={{ fontWeight: '600' }}>{formatCurrency(subtotal)}</span>
          </div>
        )}

        {data.notes && (
          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
            หมายเหตุ: {data.notes}
          </div>
        )}
      </div>

      <div style={lineStyle} />

      {/* Totals */}
      {config.vat_registered && (
        <>
          <div style={{ ...rowStyle, fontSize: '10px' }}>
            <span>ราคาก่อนภาษี</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ ...rowStyle, fontSize: '10px' }}>
            <span>ภาษีมูลค่าเพิ่ม 7%</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
          <div style={{ borderTop: '1px solid #000', margin: '4px 0' }} />
        </>
      )}
      <div style={{ ...rowStyle, fontWeight: 'bold', fontSize: '13px' }}>
        <span>รวมทั้งสิ้น</span>
        <span>{formatCurrency(total)}</span>
      </div>
      {config.vat_registered && (
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#555' }}>
          (รวมภาษีมูลค่าเพิ่มแล้ว)
        </div>
      )}

      {/* Car Info */}
      {data.license_plate && (
        <>
          <div style={lineStyle} />
          <div style={{ fontSize: '10px' }}>
            <div>
              <b>ทะเบียน:</b> {data.license_plate}
              {data.province ? ` (${data.province})` : ''}
            </div>
            {data.car_model && (
              <div>
                <b>รุ่น:</b> {data.car_model}
                {data.car_color ? ` / ${data.car_color}` : ''}
              </div>
            )}
          </div>
        </>
      )}

      <div style={lineStyle} />
      <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600' }}>
        ขอบคุณที่ใช้บริการ
      </div>
      <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', marginTop: '2px' }}>
        {config.shop_name || 'ชื่อร้าน'}
      </div>
    </div>
  );
}
