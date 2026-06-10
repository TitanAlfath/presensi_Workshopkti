import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface AttendanceRecord {
  id: string;
  type: 'PESERTA' | 'TAMU';
  checkInTime: Date;
  participant?: {
    name: string;
    nim: string;
    prodi: string;
    fakultas: string;
    phone: string;
  } | null;
  guest?: {
    name: string;
    institution: string;
    position: string;
    phone: string;
  } | null;
}

export const generateAttendancePDF = (
  res: Response,
  data: AttendanceRecord[],
  eventName: string
) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Presensi-${eventName.replace(/\s+/g, '_')}-${Date.now()}.pdf`
  );

  doc.pipe(res);

  // Header banner / title
  doc.rect(0, 0, doc.page.width, 100).fill('#1E3A8A');
  
  doc.fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .fontSize(20)
     .text('LAPORAN PRESENSI DIGITAL EVENT', 30, 30, { align: 'left' });
  
  doc.fontSize(12)
     .font('Helvetica')
     .text(`Nama Event: ${eventName}`, 30, 60, { align: 'left' });

  doc.text(`Dicetak Pada: ${new Date().toLocaleString('id-ID')}`, doc.page.width - 250, 60, { align: 'right' });

  // Reset text color
  doc.fillColor('#1F2937');
  
  // Quick Summary Info
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Ringkasan Kehadiran:', 30, 120);

  const totalPeserta = data.filter((item) => item.type === 'PESERTA').length;
  const totalTamu = data.filter((item) => item.type === 'TAMU').length;
  const totalHadir = data.length;

  doc.fontSize(10)
     .font('Helvetica')
     .text(`Total Hadir: ${totalHadir} Orang`, 30, 140)
     .text(`Total Peserta (Mahasiswa): ${totalPeserta} Orang`, 200, 140)
     .text(`Total Tamu Undangan: ${totalTamu} Orang`, 400, 140);

  doc.moveTo(30, 160).lineTo(doc.page.width - 30, 160).stroke('#D1D5DB');

  // Drawing Table Header
  const tableTop = 180;
  const colNoWidth = 30;
  const colNamaWidth = 140;
  const colKategoriWidth = 70;
  const colNimInstansiWidth = 120;
  const colProdiJabatanWidth = 110;
  const colWaktuWidth = 80;

  const getColX = (colIdx: number) => {
    let x = 30;
    if (colIdx > 0) x += colNoWidth;
    if (colIdx > 1) x += colNamaWidth;
    if (colIdx > 2) x += colKategoriWidth;
    if (colIdx > 3) x += colNimInstansiWidth;
    if (colIdx > 4) x += colProdiJabatanWidth;
    return x;
  };

  // Draw headers background
  doc.rect(30, tableTop - 5, doc.page.width - 60, 20).fill('#3B82F6');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
  
  doc.text('No', getColX(0), tableTop);
  doc.text('Nama Lengkap', getColX(1), tableTop);
  doc.text('Kategori', getColX(2), tableTop);
  doc.text('NIM / Instansi', getColX(3), tableTop);
  doc.text('Prodi / Jabatan', getColX(4), tableTop);
  doc.text('Waktu', getColX(5), tableTop);

  let currentY = tableTop + 20;

  doc.fillColor('#1F2937').font('Helvetica').fontSize(8);

  data.forEach((item, index) => {
    // Check if page needs to break
    if (currentY > doc.page.height - 50) {
      doc.addPage();
      currentY = 40;
      
      // Draw header on new page
      doc.rect(30, currentY - 5, doc.page.width - 60, 20).fill('#3B82F6');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
      
      doc.text('No', getColX(0), currentY);
      doc.text('Nama Lengkap', getColX(1), currentY);
      doc.text('Kategori', getColX(2), currentY);
      doc.text('NIM / Instansi', getColX(3), currentY);
      doc.text('Prodi / Jabatan', getColX(4), currentY);
      doc.text('Waktu', getColX(5), currentY);
      
      currentY += 20;
      doc.fillColor('#1F2937').font('Helvetica').fontSize(8);
    }

    const isParticipant = item.type === 'PESERTA';
    const name = isParticipant ? item.participant?.name : item.guest?.name;
    const category = item.type;
    const nimOrInstansi = isParticipant ? item.participant?.nim : item.guest?.institution;
    const prodiOrJabatan = isParticipant ? item.participant?.prodi : item.guest?.position;
    
    // Time formatted
    const checkInStr = new Date(item.checkInTime).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Alternate shading
    if (index % 2 === 1) {
      doc.rect(30, currentY - 4, doc.page.width - 60, 16).fill('#F3F4F6');
      doc.fillColor('#1F2937');
    }

    doc.text(String(index + 1), getColX(0), currentY);
    
    // Handle text overflows by truncating
    doc.text(name ? (name.length > 28 ? name.substring(0, 25) + '...' : name) : '', getColX(1), currentY);
    doc.text(category, getColX(2), currentY);
    doc.text(nimOrInstansi ? (nimOrInstansi.length > 24 ? nimOrInstansi.substring(0, 21) + '...' : nimOrInstansi) : '', getColX(3), currentY);
    doc.text(prodiOrJabatan ? (prodiOrJabatan.length > 22 ? prodiOrJabatan.substring(0, 19) + '...' : prodiOrJabatan) : '', getColX(4), currentY);
    doc.text(checkInStr, getColX(5), currentY);

    // Draw bottom border line
    doc.moveTo(30, currentY + 12).lineTo(doc.page.width - 30, currentY + 12).stroke('#E5E7EB');

    currentY += 16;
  });

  // Footer page counts
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#9CA3AF').fontSize(8).text(
      `Halaman ${i + 1} dari ${range.count}`,
      30,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - 60 }
    );
  }

  doc.end();
};
