import { TIRE_BRANDS, SERVICE_TYPE_MAP } from '../utils/constants.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export function ReceiptDocument({ config, data, receiptNumber, type = 'tax_invoice', services }) {
  const isCashBill = type === 'cash_bill';
  const isMulti = services && services.length > 0;

  const total = isMulti
    ? services.reduce((s, svc) => s + Number(svc.total_price || 0), 0)
    : Number(data.total_price || 0);
  const vatAmount = (!isCashBill && config.vat_registered) ? Math.round(total * 7 / 107) : 0;
  const subtotal = total - vatAmount;

  // Single-service fallback fields
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
        {!isCashBill && (
          <>
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
          </>
        )}
        {isCashBill && (
          <>
            {config.shop_name && (
              <div style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '0.5px', fontFamily: 'sans-serif' }}>
                {config.shop_name}
              </div>
            )}
            {config.address && (
              <div style={{ fontSize: '10px', marginTop: '1px', lineHeight: '1.4' }}>{config.address}</div>
            )}
          </>
        )}
      </div>

      <div style={lineStyle} />

      {/* Invoice Type */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px' }}>
          {isCashBill ? 'บิลเงินสด' : 'ใบกำกับภาษีอย่างย่อ'}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: isCashBill ? 'center' : 'space-between', fontSize: '10px', marginTop: '2px' }}>
        {!isCashBill && <span>เลขที่: {receiptNumber || 'DRAFT'}</span>}
        <span>วันที่: {formatDate(data.date)}</span>
      </div>

      <div style={lineStyle} />

      {/* Items */}
      <div style={{ ...rowStyle, fontWeight: 'bold', marginBottom: '4px' }}>
        <span>รายการ</span>
        <span>ราคา</span>
      </div>

      {isMulti ? (
        <div style={{ marginBottom: '4px' }}>
          {services.map((svc, i) => {
            const svcLabel = SERVICE_TYPE_MAP[svc.service_type]?.label || svc.service_type || '';
            const svcBrand = TIRE_BRANDS.find(b => b.code === svc.tire_brand)?.label || svc.tire_brand || '';
            const svcIsTire = svc.service_type === 'tire_change';
            const svcIsPart = svc.service_type === 'part_change';
            const svcTotal = Number(svc.total_price || 0);
            return (
              <div key={i} style={{ marginBottom: '6px' }}>
                <div style={{ fontWeight: '600' }}>{svcLabel}</div>
                {svcIsTire && (
                  <>
                    <div style={{ fontSize: '10px', color: '#333' }}>
                      {[svcBrand, svc.tire_model, svc.tire_size].filter(Boolean).join(' / ')}
                    </div>
                    <div style={{ ...rowStyle }}>
                      <span style={{ fontSize: '10px' }}>
                        {formatCurrency(svc.price_per_unit)} × {svc.quantity} เส้น
                      </span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(svcTotal)}</span>
                    </div>
                  </>
                )}
                {svcIsPart && svc.parts && svc.parts.length > 0 && (
                  <>
                    {svc.parts.map((p, pi) => (
                      <div key={pi} style={{ ...rowStyle, fontSize: '10px' }}>
                        <span>{p.name} × {p.qty}</span>
                        <span style={{ fontWeight: '600' }}>{formatCurrency(Number(p.price_per_unit) * Number(p.qty))}</span>
                      </div>
                    ))}
                  </>
                )}
                {!svcIsTire && !svcIsPart && (
                  <div style={{ ...rowStyle }}>
                    <span />
                    <span style={{ fontWeight: '600' }}>{formatCurrency(svcTotal)}</span>
                  </div>
                )}
              </div>
            );
          })}
          {data.notes && (
            <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
              หมายเหตุ: {data.notes}
            </div>
          )}
        </div>
      ) : (
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
      )}

      <div style={lineStyle} />

      {/* Totals */}
      {!isCashBill && config.vat_registered && (
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
      {!isCashBill && config.vat_registered && (
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
      {config.shop_name && (
        <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', marginTop: '2px' }}>
          {config.shop_name}
        </div>
      )}
    </div>
  );
}
