
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '../types';
import { TRANSLATIONS, COMPANY_DETAILS } from '../constants';

// Helper to format currency
const fmt = (num: number, currency: string = '') => 
  `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ' ' + currency : ''}`;

// --- CALCULATION LOGIC ---
export const calculateQuotation = (q: Quotation) => {
  const results: any[] = [];
  
  const extraServicesPP = q.extraServicesMADPerPerson || 0;
  const commissionPP = q.commissionMADPerPerson || 0;
  const marginPP = q.agencyMarginMADPerPerson || 0;

  let grandTotalMAD = 0;

  q.rooms.forEach(room => {
    // 1. Hotel Costs (SAR per person total for the stay)
    const madinahCost = room.hasMadinah ? (room.madinahPricePerPersonSAR * room.madinahNights) : 0;
    const makkahCost = room.hasMakkah ? (room.makkahPricePerPersonSAR * room.makkahNights) : 0;
    
    // 2. Extras (SAR per person)
    const transferCost = q.hasTransfer ? q.transferPriceSAR : 0;
    const visaCost = q.hasVisa ? q.visaPriceSAR : 0;
    const otherServicesSAR = q.otherServices.reduce((sum, s) => sum + s.priceSAR, 0);

    const totalSARPerPerson = madinahCost + makkahCost + transferCost + visaCost + otherServicesSAR;

    // 3. Convert to MAD (Base Cost)
    const baseMADPerPerson = totalSARPerPerson * q.exchangeRate;

    // 4. Flight (MAD)
    const flightMADPerPerson = q.hasFlight ? q.flightPriceMAD : 0;

    // 5. Final Selling Price (Per Person)
    const finalPricePerPersonMAD = baseMADPerPerson + flightMADPerPerson + extraServicesPP + commissionPP + marginPP;

    // Room Totals
    const paxInThisConfig = room.count * room.paxPerRoom;
    const totalRoomLineMAD = finalPricePerPersonMAD * paxInThisConfig;
    
    grandTotalMAD += totalRoomLineMAD;

    results.push({
      roomType: room.type,
      count: room.count,
      paxPerRoom: room.paxPerRoom,
      totalPaxInConfig: paxInThisConfig,
      
      perPerson: {
        madinah: madinahCost,
        makkah: makkahCost,
        visa: visaCost,
        transfer: transferCost,
        flight: flightMADPerPerson,
        extraServices: extraServicesPP,
        commission: commissionPP,
        agencyMargin: marginPP,
        totalSAR: totalSARPerPerson,
        baseMAD: baseMADPerPerson,
        finalMAD: finalPricePerPersonMAD
      },

      hotels: {
        madinah: room.madinahHotel || 'N/A',
        makkah: room.makkahHotel || 'N/A',
        madinahNights: room.madinahNights,
        makkahNights: room.makkahNights
      }
    });
  });

  return { rows: results, grandTotalMAD };
};

// --- PDF GENERATION ---
export const generatePDF = (quotation: Quotation, type: 'CLIENT' | 'AGENCY', logoBase64: string | null) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.width; // 210
  const pageHeight = doc.internal.pageSize.height; // 297
  const MARGIN = 14; // mm
  const CONTENT_WIDTH = pageWidth - (MARGIN * 2);

  const langCode = quotation.language === 'ar' ? 'en' : quotation.language; 
  const t = TRANSLATIONS[langCode] || TRANSLATIONS['en'];

  // --- STYLING CONSTANTS (WHITE THEME) ---
  const COLORS = {
    BG: '#ffffff',        // White Background
    PRIMARY: '#0f172a',   // Dark Navy (Headings/Footer)
    ACCENT: '#d4af37',    // Gold (Accents/Highlights)
    TEXT_MAIN: '#334155', // Dark Slate (Body Text)
    TEXT_MUTED: '#64748b',// Muted Gray (Labels)
    TABLE_HEAD: '#0f172a',// Navy Header for Tables
    TABLE_HEAD_TEXT: '#d4af37', // Gold text in table header
    TABLE_BODY_STRIPE: '#f8fafc', // Very Light Gray for alternating rows
    BORDER: '#e2e8f0'     // Light Border
  };

  // --- BACKGROUND ---
  doc.setFillColor(COLORS.BG);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // --- HEADER SECTION ---
  let yPos = 12;

  // 1. Logo
  if (logoBase64) {
    try {
      // Keep ratio, max width 25mm, max height 15mm
      doc.addImage(logoBase64, 'JPEG', MARGIN, yPos, 25, 15, undefined, 'FAST');
    } catch (e) {
      doc.setFontSize(14);
      doc.setTextColor(COLORS.PRIMARY);
      doc.setFont("helvetica", "bold");
      doc.text("MHT TRAVEL", MARGIN, yPos + 10);
    }
  } else {
    doc.setFontSize(16);
    doc.setTextColor(COLORS.PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.text("MHT", MARGIN, yPos + 10);
  }

  // 2. Title & Ref
  doc.setFontSize(18);
  doc.setTextColor(COLORS.PRIMARY);
  doc.setFont("helvetica", "bold");
  const titleText = type === 'CLIENT' ? "COTATION" : "AGENCY REPORT";
  doc.text(titleText, pageWidth - MARGIN, yPos + 8, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(`${t.reference}: ${quotation.reference}`, pageWidth - MARGIN, yPos + 14, { align: 'right' });
  doc.text(`${t.date}: ${new Date(quotation.createdAt).toLocaleDateString()}`, pageWidth - MARGIN, yPos + 19, { align: 'right' });

  yPos += 24; 

  // --- WELCOMING SENTENCE ---
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_MUTED);
  doc.setFont("helvetica", "italic");
  const welcomeText = "Thank you for choosing MHT Agency! We are delighted to assist you in planning your journey with comfort and excellence.";
  doc.text(welcomeText, MARGIN, yPos);
  
  yPos += 8;

  // --- CLIENT INFO GRID ---
  doc.setDrawColor(COLORS.ACCENT);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, yPos, pageWidth - MARGIN, yPos);
  
  yPos += 5;
  
  const colW = CONTENT_WIDTH / 4;
  
  // Safe label drawing with truncation to prevent overlap
  const drawLabelValue = (label: string, value: string, x: number, width: number, align: 'left' | 'right' = 'left') => {
    doc.setFontSize(7);
    doc.setTextColor(COLORS.TEXT_MUTED);
    const labelX = align === 'right' ? x + width : x;
    doc.text(label.toUpperCase(), labelX, yPos, { align });
    
    doc.setFontSize(9);
    doc.setTextColor(COLORS.PRIMARY); // Dark text for readability on white
    doc.setFont("helvetica", "bold");
    
    // Truncate text if it's too long
    let displayValue = value || '-';
    const maxChars = Math.floor(width / 2.3); 
    if (displayValue.length > maxChars) {
        displayValue = displayValue.substring(0, maxChars - 2) + '...';
    }
    
    const valueX = align === 'right' ? x + width : x;
    doc.text(displayValue, valueX, yPos + 4, { align });
  };

  drawLabelValue(t.clientName, quotation.clientName, MARGIN, colW);
  drawLabelValue(t.mobile, quotation.clientPhone, MARGIN + colW, colW);
  drawLabelValue("EMAIL", quotation.clientEmail, MARGIN + (colW * 2), colW);
  drawLabelValue(t.pax, `${quotation.paxCount} Person(s)`, MARGIN + (colW * 3), colW, 'right');

  yPos += 10;

  // --- CALCULATION & DATA PREP ---
  const { rows, grandTotalMAD } = calculateQuotation(quotation);

  // --- SERVICES SUMMARY (Compact) ---
  doc.setFontSize(11);
  doc.setTextColor(COLORS.PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text(t.servicesInclus, MARGIN, yPos);
  yPos += 5;

  const services = [];
  if (quotation.hasFlight) services.push(`${t.flight}: ${quotation.airline}`);
  if (quotation.hasVisa) services.push("Visa Included");
  
  if (quotation.hasTransfer) {
     const detailText = quotation.transferDetails ? ` (${quotation.transferDetails.replace(/\n/g, ', ')})` : '';
     services.push(`Transfers Included${detailText}`);
  }

  if (quotation.hasMazarat) services.push(t.mazarat);
  if (quotation.hasFaqih) services.push(t.faqih);
  
  // Hotels
  const madinahH = [...new Set(rows.map(r => r.hotels.madinah).filter(Boolean))].join(', ');
  const makkahH = [...new Set(rows.map(r => r.hotels.makkah).filter(Boolean))].join(', ');
  if (madinahH) services.push(`${t.madinah}: ${madinahH}`);
  if (makkahH) services.push(`${t.makkah}: ${makkahH}`);

  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_MAIN);
  doc.setFont("helvetica", "normal");
  const serviceText = doc.splitTextToSize(services.join('  •  '), CONTENT_WIDTH);
  doc.text(serviceText, MARGIN, yPos);
  
  yPos += (serviceText.length * 4) + 6;

  // --- FINANCIAL TABLE ---
  doc.setFontSize(11);
  doc.setTextColor(COLORS.PRIMARY);
  doc.setFont("helvetica", "bold");
  const tableTitle = type === 'CLIENT' ? t.detailsTarifs : t.financialDetails;
  doc.text(tableTitle, MARGIN, yPos);
  yPos += 2;

  let head = [];
  let body = [];
  let colStyles = {};

  if (type === 'CLIENT') {
    // Client View: Clean
    head = [[t.room.toUpperCase(), 'DETAILS', 'QTY', 'PAX', 'PRICE (MAD)']];
    body = rows.map(r => [
      r.roomType,
      `${r.hotels.madinahNights}N Madinah / ${r.hotels.makkahNights}N Makkah\nMadinah: ${r.hotels.madinah}\nMakkah: ${r.hotels.makkah}`,
      r.count,
      r.paxPerRoom,
      fmt(r.perPerson.finalMAD)
    ]);
    colStyles = {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 'auto' }, // Let details take max space
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', fontStyle: 'bold', textColor: COLORS.PRIMARY, cellWidth: 35 }
    };
  } else {
    // Agency View: Detailed
    head = [[
      'ROOM', 
      'BASE(SAR)', 
      'BASE(MAD)', 
      'FLIGHT', 
      'EXTRAS', 
      'COMM', 
      'MARGIN', 
      'TOTAL(MAD)'
    ]];
    body = rows.map(r => [
      r.roomType,
      fmt(r.perPerson.totalSAR),
      fmt(r.perPerson.baseMAD),
      fmt(r.perPerson.flight),
      fmt(r.perPerson.extraServices),
      fmt(r.perPerson.commission),
      fmt(r.perPerson.agencyMargin),
      fmt(r.perPerson.finalMAD)
    ]);
    colStyles = {
      0: { fontStyle: 'bold', cellWidth: 22, halign: 'left' },
      1: { halign: 'right', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', fontStyle: 'bold', textColor: COLORS.PRIMARY, cellWidth: 'auto' }
    };
  }

  autoTable(doc, {
    startY: yPos,
    head: head,
    body: body,
    theme: 'striped', // Striped looks better on white
    styles: {
      fillColor: false, 
      textColor: COLORS.TEXT_MAIN,
      fontSize: type === 'AGENCY' ? 7 : 8,
      cellPadding: 3,
      lineColor: COLORS.BORDER,
      lineWidth: 0.1,
      valign: 'middle'
    },
    headStyles: {
      fillColor: COLORS.TABLE_HEAD, // Navy Header
      textColor: COLORS.TABLE_HEAD_TEXT, // Gold Text
      fontStyle: 'bold',
      fontSize: type === 'AGENCY' ? 7 : 8,
      halign: type === 'AGENCY' ? 'right' : 'center'
    },
    // Force first header column to left align if needed
    didParseCell: function(data) {
        if (data.section === 'head' && data.column.index === 0) {
            data.cell.styles.halign = 'left';
        }
    },
    columnStyles: colStyles,
    margin: { left: MARGIN, right: MARGIN }
  });

  // --- TOTALS SECTION ---
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  
  // Draw Total Box - Navy Box with Gold Text
  const boxWidth = 100;
  const boxX = pageWidth - MARGIN - boxWidth;
  
  doc.setFillColor(COLORS.PRIMARY); // Navy Box
  doc.roundedRect(boxX, finalY, boxWidth, 12, 1, 1, 'F');
  
  // Label: Left Aligned
  doc.setFontSize(10);
  doc.setTextColor(COLORS.BG); // White text
  doc.setFont("helvetica", "bold");
  doc.text(t.totalGlobal.toUpperCase(), boxX + 4, finalY + 7.5);
  
  // Value: Right Aligned
  doc.setFontSize(14);
  doc.setTextColor(COLORS.ACCENT); // Gold text for number
  doc.text(fmt(grandTotalMAD, 'MAD'), pageWidth - MARGIN - 4, finalY + 8, { align: 'right' });

  // Agency Profit Breakdown
  if (type === 'AGENCY') {
    const profitY = finalY + 18;
    const totalProfit = (quotation.commissionMADPerPerson + quotation.agencyMarginMADPerPerson) * quotation.paxCount;
    const totalExtras = quotation.extraServicesMADPerPerson * quotation.paxCount;
    
    doc.setFontSize(8);
    doc.setTextColor(COLORS.TEXT_MUTED);
    doc.text("PROFITABILITY BREAKDOWN:", boxX, profitY);
    
    doc.setFontSize(9);
    doc.setTextColor(COLORS.PRIMARY);
    doc.text(`EXTRAS: ${fmt(totalExtras, 'MAD')}`, boxX, profitY + 5);
    doc.text(`NET PROFIT: ${fmt(totalProfit, 'MAD')}`, boxX, profitY + 10);
  }

  // --- FOOTER (Fixed at Bottom) ---
  const footerY = pageHeight - 15;
  
  doc.setDrawColor(COLORS.ACCENT);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, footerY - 5, pageWidth - MARGIN, footerY - 5);

  // NB Note
  doc.setFontSize(7);
  doc.setTextColor(COLORS.TEXT_MUTED);
  const noteLines = doc.splitTextToSize(t.nbText, CONTENT_WIDTH);
  doc.text(noteLines, MARGIN, footerY - 8);

  // Company Details
  doc.setFontSize(9);
  doc.setTextColor(COLORS.PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("MHT TRAVEL", MARGIN, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_MAIN);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY_DETAILS.address}  |  ${COMPANY_DETAILS.phone}`, MARGIN, footerY + 4);
  doc.text(COMPANY_DETAILS.legal, MARGIN, footerY + 8);

  // Save
  doc.save(`MHT_${type}_${quotation.reference}.pdf`);
};