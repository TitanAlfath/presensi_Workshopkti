import ExcelJS from 'exceljs';
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
    email?: string;
  } | null;
  guest?: {
    name: string;
    institution: string;
    position: string;
    phone: string;
  } | null;
}

export const generateAttendanceExcel = async (
  res: Response,
  data: AttendanceRecord[],
  eventName: string
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daftar Hadir');

  // Title Row
  worksheet.mergeCells('A1:J1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `DAFTAR HADIR - ${eventName.toUpperCase()}`;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' } // Navy Dark Blue
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 40;

  // Header Row
  const headers = [
    'No',
    'Nama Lengkap',
    'Kategori',
    'NIM / Instansi',
    'Prodi / Jabatan',
    'Fakultas',
    'Nomor HP',
    'Email',
    'Waktu Presensi',
    'Status'
  ];

  worksheet.addRow([]); // Blank spacer
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '3B82F6' } // Blue primary
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Data rows
  data.forEach((item, index) => {
    const no = index + 1;
    const isParticipant = item.type === 'PESERTA';
    const name = isParticipant ? item.participant?.name : item.guest?.name;
    const category = item.type;
    const nimOrInstansi = isParticipant ? item.participant?.nim : item.guest?.institution;
    const prodiOrJabatan = isParticipant ? item.participant?.prodi : item.guest?.position;
    const fakultas = isParticipant ? item.participant?.fakultas : '-';
    const phone = isParticipant ? item.participant?.phone : item.guest?.phone;
    
    const email = isParticipant ? item.participant?.email : '-';

    // Format checkInTime to Local String
    const checkInStr = new Date(item.checkInTime).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    const status = 'Hadir';

    const rowData = [
      no,
      name || '',
      category,
      nimOrInstansi || '',
      prodiOrJabatan || '',
      fakultas || '',
      phone || '',
      email || '',
      checkInStr,
      status
    ];

    const addedRow = worksheet.addRow(rowData);
    addedRow.height = 20;

    // Center/Left alignments and border styles
    addedRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } }
      };
      cell.font = { name: 'Arial', size: 10 };

      // Row alternate background color
      if (index % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F9FAFB' }
        };
      }

      if (colNumber === 1 || colNumber === 3 || colNumber === 8 || colNumber === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // Adjust column widths automatically
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value ? String(cell.value) : '';
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    });
    column.width = Math.max(maxLen + 4, 10);
  });

  // Set response headers and send Excel back
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Presensi-${eventName.replace(/\s+/g, '_')}-${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};
