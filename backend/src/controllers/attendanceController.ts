import { Request, Response } from 'express';
import prisma from '../config/db';
import { notifyNewAttendance } from '../utils/socket';
import { generateAttendanceExcel } from '../utils/excelGenerator';
import { generateAttendancePDF } from '../utils/pdfGenerator';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

// Check-in Attendance (Participant or Guest)
export const checkIn = async (req: Request, res: Response) => {
  try {
    const { eventId, type, name, phone, nim, prodi, fakultas, institution, position } = req.body;

    if (!eventId || !type) {
      return res.status(400).json({ message: 'Event ID dan tipe presensi harus ditentukan!' });
    }

    // Verify Event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    let attendanceRecord = null;
    let participantRecord = null;
    let guestRecord = null;

    if (type === 'PESERTA') {
      const email = req.body.email;

      if (!nim) {
        return res.status(400).json({ message: 'NIM wajib diisi!' });
      }

      // Strict Check: Participant must be pre-registered (imported by Admin)
      participantRecord = await prisma.participant.findUnique({
        where: { nim }
      });

      if (!participantRecord) {
        return res.status(404).json({ message: 'Data peserta tidak ditemukan. Pastikan Anda sudah terdaftar (ter-import) oleh panitia.' });
      }

      // Update email with data from form (phone is kept as is from db unless provided)
      participantRecord = await prisma.participant.update({
        where: { nim },
        data: { 
          phone: phone || participantRecord.phone, 
          email: email || participantRecord.email 
        }
      });

      // Check if participant already checked in to this event
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          eventId,
          type: 'PESERTA',
          participantId: participantRecord.id
        }
      });

      if (existingAttendance) {
        return res.status(400).json({
          message: `Peserta dengan NIM ${nim} sudah melakukan presensi pada event ini!`,
          alreadyCheckedIn: true,
          attendance: existingAttendance
        });
      }

      // Create attendance
      attendanceRecord = await prisma.attendance.create({
        data: {
          eventId,
          type: 'PESERTA',
          participantId: participantRecord.id
        },
        include: {
          participant: true,
          event: true
        }
      });

    } else if (type === 'TAMU') {
      if (!name || !institution || !position || !phone) {
        return res.status(400).json({ message: 'Semua kolom untuk Tamu Undangan wajib diisi!' });
      }

      // We lookup guest by phone and name combination to prevent duplicate records
      // Or just create new guest every time. Let's try to lookup by phone first
      guestRecord = await prisma.guest.findFirst({
        where: { phone, name }
      });

      if (!guestRecord) {
        guestRecord = await prisma.guest.create({
          data: { name, institution, position, phone }
        });
      } else {
        // Update details if they changed
        guestRecord = await prisma.guest.update({
          where: { id: guestRecord.id },
          data: { institution, position }
        });
      }

      // Check if guest already checked in to this event
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          eventId,
          type: 'TAMU',
          guestId: guestRecord.id
        }
      });

      if (existingAttendance) {
        return res.status(400).json({
          message: `Tamu dengan nama ${name} sudah melakukan presensi pada event ini!`,
          alreadyCheckedIn: true,
          attendance: existingAttendance
        });
      }

      // Create attendance
      attendanceRecord = await prisma.attendance.create({
        data: {
          eventId,
          type: 'TAMU',
          guestId: guestRecord.id
        },
        include: {
          guest: true,
          event: true
        }
      });
    } else {
      return res.status(400).json({ message: 'Tipe presensi tidak valid. Harus PESERTA atau TAMU' });
    }

    // Broadcast the new attendance event to dashboard in real-time
    notifyNewAttendance(attendanceRecord);

    res.status(201).json({
      message: 'Presensi berhasil dicatat. Selamat datang!',
      attendance: attendanceRecord
    });

  } catch (error: any) {
    console.error('Error in checkIn:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mencatat presensi', error: error.message });
  }
};

// Get Dashboard Statistics
export const getStats = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.query;

    let targetEventId = eventId as string;

    // If eventId is not specified, get active event first
    if (!targetEventId) {
      const activeSetting = await prisma.settings.findUnique({
        where: { key: 'activeEventId' }
      });
      if (activeSetting) {
        targetEventId = activeSetting.value;
      } else {
        const fallbackEvent = await prisma.event.findFirst({ orderBy: { createdAt: 'desc' } });
        if (fallbackEvent) {
          targetEventId = fallbackEvent.id;
        }
      }
    }

    if (!targetEventId) {
      return res.status(200).json({
        totalHadir: 0,
        totalPeserta: 0,
        totalTamu: 0,
        hadirHariIni: 0,
        byDate: [],
        byProdi: [],
        byFakultas: []
      });
    }

    // 1. Total Attendance counts
    const attendances = await prisma.attendance.findMany({
      where: { eventId: targetEventId },
      include: {
        participant: true,
        guest: true
      }
    });

    const totalHadir = attendances.length;

    // Fetch Total Participants and Guests from Master Data
    const totalPeserta = await prisma.participant.count();
    const totalTamu = await prisma.guest.count();

    // 2. Attendance Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const hadirHariIni = attendances.filter(a => {
      const checkIn = new Date(a.checkInTime);
      return checkIn >= today && checkIn < tomorrow;
    }).length;

    // 3. Stats by Date (grouping by date)
    const dateGroups: { [key: string]: number } = {};
    attendances.forEach(a => {
      const dateStr = new Date(a.checkInTime).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    });

    const byDate = Object.keys(dateGroups).map(date => ({
      date,
      count: dateGroups[date]
    })).sort((a, b) => {
      // Sort DD/MM/YYYY
      const partsA = a.date.split('/');
      const partsB = b.date.split('/');
      return new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`).getTime() - new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`).getTime();
    });

    // 4. Stats by Prodi (from Master Data)
    const allParticipants = await prisma.participant.findMany();
    const prodiGroups: { [key: string]: number } = {};
    allParticipants.forEach(p => {
      const prodi = p.prodi || 'Lainnya';
      prodiGroups[prodi] = (prodiGroups[prodi] || 0) + 1;
    });
    const byProdi = Object.keys(prodiGroups).map(prodi => ({
      prodi,
      count: prodiGroups[prodi]
    }));

    // 5. Stats by Fakultas (from Master Data)
    const fakultasGroups: { [key: string]: number } = {};
    allParticipants.forEach(p => {
      const fak = p.fakultas || 'Lainnya';
      fakultasGroups[fak] = (fakultasGroups[fak] || 0) + 1;
    });
    const byFakultas = Object.keys(fakultasGroups).map(fakultas => ({
      fakultas,
      count: fakultasGroups[fakultas]
    }));

    res.status(200).json({
      totalHadir,
      totalPeserta,
      totalTamu,
      hadirHariIni,
      byDate,
      byProdi,
      byFakultas
    });

  } catch (error: any) {
    console.error('Error in getStats:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil statistik', error: error.message });
  }
};

// List Attendance with Search, Filter & Pagination
export const listAttendance = async (req: Request, res: Response) => {
  try {
    const { eventId, page = 1, limit = 10, search = '', type, date } = req.query;

    let targetEventId = eventId as string;

    if (!targetEventId) {
      const activeSetting = await prisma.settings.findUnique({
        where: { key: 'activeEventId' }
      });
      if (activeSetting) {
        targetEventId = activeSetting.value;
      } else {
        const fallbackEvent = await prisma.event.findFirst({ orderBy: { createdAt: 'desc' } });
        if (fallbackEvent) {
          targetEventId = fallbackEvent.id;
        }
      }
    }

    if (!targetEventId) {
      return res.status(200).json({
        data: [],
        pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 }
      });
    }

    const p = Number(page);
    const l = Number(limit);
    const skip = (p - 1) * l;

    // Build filter clause
    const whereClause: any = {
      eventId: targetEventId
    };

    if (type === 'PESERTA' || type === 'TAMU') {
      whereClause.type = type;
    }

    if (date) {
      const filterDate = new Date(date as string);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      whereClause.checkInTime = {
        gte: filterDate,
        lt: nextDay
      };
    }

    // Search matches Participant (name, nim, prodi, fakultas) or Guest (name, institution, position)
    if (search) {
      const searchStr = String(search);
      whereClause.OR = [
        {
          participant: {
            OR: [
              { name: { contains: searchStr, mode: 'insensitive' } },
              { nim: { contains: searchStr, mode: 'insensitive' } },
              { prodi: { contains: searchStr, mode: 'insensitive' } },
              { fakultas: { contains: searchStr, mode: 'insensitive' } }
            ]
          }
        },
        {
          guest: {
            OR: [
              { name: { contains: searchStr, mode: 'insensitive' } },
              { institution: { contains: searchStr, mode: 'insensitive' } },
              { position: { contains: searchStr, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    // Query DB
    const total = await prisma.attendance.count({ where: whereClause });
    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        participant: true,
        guest: true
      },
      orderBy: { checkInTime: 'desc' },
      skip,
      take: l
    });

    res.status(200).json({
      data: records,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      }
    });

  } catch (error: any) {
    console.error('Error in listAttendance:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data presensi', error: error.message });
  }
};

// Delete Attendance Record
export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attendance = await prisma.attendance.findUnique({ where: { id } });
    if (!attendance) {
      return res.status(404).json({ message: 'Data presensi tidak ditemukan' });
    }

    await prisma.attendance.delete({ where: { id } });

    res.status(200).json({ message: 'Data presensi berhasil dihapus' });
  } catch (error: any) {
    console.error('Error in deleteAttendance:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus data presensi', error: error.message });
  }
};

// Delete Multiple Attendance Records
export const deleteMultipleAttendance = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'List id wajib diberikan' });
    }

    await prisma.attendance.deleteMany({
      where: { id: { in: ids } }
    });

    res.status(200).json({ message: `${ids.length} data presensi berhasil dihapus` });
  } catch (error: any) {
    console.error('Error in deleteMultipleAttendance:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus data', error: error.message });
  }
};

// Clear All Attendance Records for an Event
export const clearAllAttendance = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ message: 'eventId wajib diberikan' });
    }

    const result = await prisma.attendance.deleteMany({
      where: { eventId: String(eventId) }
    });

    res.status(200).json({ message: `Semua data presensi (${result.count} data) berhasil dikosongkan` });
  } catch (error: any) {
    console.error('Error in clearAllAttendance:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengosongkan data', error: error.message });
  }
};

// Export to Excel
export const exportExcel = async (req: Request, res: Response) => {
  try {
    const { eventId, type, date } = req.query;

    let targetEventId = eventId as string;

    if (!targetEventId) {
      const activeSetting = await prisma.settings.findUnique({
        where: { key: 'activeEventId' }
      });
      if (activeSetting) targetEventId = activeSetting.value;
    }

    if (!targetEventId) {
      return res.status(400).json({ message: 'Tidak ada event aktif untuk diexport!' });
    }

    const event = await prisma.event.findUnique({ where: { id: targetEventId } });
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    const whereClause: any = { eventId: targetEventId };
    if (type === 'PESERTA' || type === 'TAMU') whereClause.type = type;
    if (date) {
      const filterDate = new Date(date as string);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause.checkInTime = { gte: filterDate, lt: nextDay };
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        participant: true,
        guest: true
      },
      orderBy: { checkInTime: 'asc' }
    });

    await generateAttendanceExcel(res, records, event.name);

  } catch (error: any) {
    console.error('Error in exportExcel:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat export Excel', error: error.message });
  }
};

// Export to PDF
export const exportPDF = async (req: Request, res: Response) => {
  try {
    const { eventId, type, date } = req.query;

    let targetEventId = eventId as string;

    if (!targetEventId) {
      const activeSetting = await prisma.settings.findUnique({
        where: { key: 'activeEventId' }
      });
      if (activeSetting) targetEventId = activeSetting.value;
    }

    if (!targetEventId) {
      return res.status(400).json({ message: 'Tidak ada event aktif untuk diexport!' });
    }

    const event = await prisma.event.findUnique({ where: { id: targetEventId } });
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    const whereClause: any = { eventId: targetEventId };
    if (type === 'PESERTA' || type === 'TAMU') whereClause.type = type;
    if (date) {
      const filterDate = new Date(date as string);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause.checkInTime = { gte: filterDate, lt: nextDay };
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        participant: true,
        guest: true
      },
      orderBy: { checkInTime: 'asc' }
    });

    generateAttendancePDF(res, records, event.name);

  } catch (error: any) {
    console.error('Error in exportPDF:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat export PDF', error: error.message });
  }
};

// Import Participants or Guests from Excel/CSV
export const importParticipants = async (req: Request, res: Response) => {
  try {
    const { eventId, type = 'PESERTA' } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID wajib disertakan untuk melakukan import!' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File Excel (.xlsx/.xls/.csv) harus diupload!' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    
    // Read based on file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.csv') {
      await workbook.csv.readFile(filePath);
    } else {
      await workbook.xlsx.readFile(filePath);
    }
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Sheet data tidak ditemukan di file Excel.');
    }

    let importedCount = 0;
    let duplicateCount = 0;

    // Helper to extract cell values safely
    const getCleanStringVal = (cell: ExcelJS.Cell): string => {
      if (!cell || cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object') {
        if ('result' in cell.value && cell.value.result !== undefined && cell.value.result !== null) {
          return String(cell.value.result).trim();
        }
        if ('richText' in cell.value && Array.isArray(cell.value.richText)) {
          return cell.value.richText.map(t => t.text || '').join('').trim();
        }
        if ('text' in cell.value) {
          return String(cell.value.text).trim();
        }
        return JSON.stringify(cell.value).trim();
      }
      return String(cell.value).trim();
    };

    // Extract all valid rows
    const rowsToProcess: ExcelJS.Row[] = [];
    worksheet.eachRow((row, rowNumber) => {
      const firstCell = getCleanStringVal(row.getCell(1)).toLowerCase();
      const secondCell = getCleanStringVal(row.getCell(2)).toLowerCase();
      
      // Skip title rows (e.g. "daftar hadir") and completely empty rows
      if (firstCell.includes('daftar hadir') || (!firstCell && !secondCell)) {
        return;
      }
      
      // Skip header row
      if (firstCell === 'no' || secondCell.includes('nama lengkap') || secondCell === 'nama') {
        return; 
      }
      
      rowsToProcess.push(row);
    });

    // Process rows sequentially to prevent unique constraint race conditions
    for (const row of rowsToProcess) {
      if (type === 'TAMU') {
        // Columns format: No, Nama Lengkap, Instansi/Lembaga, Jabatan, Nomor HP
        const name = getCleanStringVal(row.getCell(2));
        const institution = getCleanStringVal(row.getCell(3));
        const position = getCleanStringVal(row.getCell(4));
        const phone = getCleanStringVal(row.getCell(5));

        if (!name) continue;

        // Find or create guest
        let guest = await prisma.guest.findFirst({
          where: {
            name,
            OR: [
              { phone: phone !== '-' && phone !== '' ? phone : undefined },
              { institution: institution !== '' ? institution : undefined }
            ]
          }
        });

        if (!guest) {
          guest = await prisma.guest.create({
            data: {
              name,
              institution: institution || 'Lainnya',
              position: position || 'Lainnya',
              phone: phone || '-'
            }
          });
        } else {
          // Update details
          guest = await prisma.guest.update({
            where: { id: guest.id },
            data: {
              institution: institution || guest.institution,
              position: position || guest.position,
              phone: phone || guest.phone
            }
          });
        }

        // Check if already checked in
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            eventId,
            type: 'TAMU',
            guestId: guest.id
          }
        });

        if (!existingAttendance) {
          const att = await prisma.attendance.create({
            data: {
              eventId,
              type: 'TAMU',
              guestId: guest.id
            },
            include: {
              guest: true,
              event: true
            }
          });
          importedCount++;
          notifyNewAttendance(att);
        } else {
          duplicateCount++;
        }

      } else {
        // Columns format: No, Nama Lengkap, NIM, Program Studi, Fakultas, Nomor HP, Email
        const name = getCleanStringVal(row.getCell(2));
        const nim = getCleanStringVal(row.getCell(3));
        const prodi = getCleanStringVal(row.getCell(4));
        const fakultas = getCleanStringVal(row.getCell(5));
        const phone = getCleanStringVal(row.getCell(6));
        const email = getCleanStringVal(row.getCell(7));

        if (!name || !nim) continue;

        // Upsert participant
        const participant = await prisma.participant.upsert({
          where: { nim },
          update: {
            name,
            prodi: prodi || 'Lainnya',
            fakultas: fakultas || 'Lainnya',
            phone: phone || '-',
            ...(email ? { email } : {})
          },
          create: {
            name,
            nim,
            prodi: prodi || 'Lainnya',
            fakultas: fakultas || 'Lainnya',
            phone: phone || '-',
            ...(email ? { email } : {})
          }
        });

        // Check if already checked in
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            eventId,
            type: 'PESERTA',
            participantId: participant.id
          }
        });

        if (!existingAttendance) {
          const att = await prisma.attendance.create({
            data: {
              eventId,
              type: 'PESERTA',
              participantId: participant.id
            },
            include: {
              participant: true,
              event: true
            }
          });
          importedCount++;
          notifyNewAttendance(att);
        } else {
          duplicateCount++;
        }
      }
    }

    // Clean up uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.error('Error removing temporary upload file:', fsErr);
    }

    res.status(200).json({
      message: 'Proses import selesai.',
      totalImported: importedCount,
      totalDuplicatesSkipped: duplicateCount
    });

  } catch (error: any) {
    console.error('Error in importParticipants:', error);
    // Cleanup if file exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (fsErr) {
        console.error('Error removing temporary upload file on error:', fsErr);
      }
    }
    res.status(500).json({ message: 'Terjadi kesalahan saat import data', error: error.message });
  }
};

// Lookup Participant by NIM or Guest by Phone number (for pre-filling attendance forms)
export const lookupParticipantOrGuest = async (req: Request, res: Response) => {
  try {
    const { nim, phone, eventId } = req.query;

    if (!nim && !phone) {
      return res.status(400).json({ message: 'NIM atau nomor HP harus ditentukan!' });
    }

    if (nim) {
      const participant = await prisma.participant.findUnique({
        where: { nim: String(nim) }
      });
      if (participant) {
        let alreadyCheckedIn = false;
        if (eventId) {
          const existingAttendance = await prisma.attendance.findFirst({
            where: {
              eventId: String(eventId),
              type: 'PESERTA',
              participantId: participant.id
            }
          });
          if (existingAttendance) {
            alreadyCheckedIn = true;
          }
        }
        return res.status(200).json({ found: true, type: 'PESERTA', data: participant, alreadyCheckedIn });
      }
    }

    if (phone) {
      const guest = await prisma.guest.findFirst({
        where: { phone: String(phone) }
      });
      if (guest) {
        return res.status(200).json({ found: true, type: 'TAMU', data: guest });
      }
    }

    return res.status(200).json({ found: false });
  } catch (error: any) {
    console.error('Error in lookupParticipantOrGuest:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mencari data', error: error.message });
  }
};

// List Checked-In Attendance for Public Display (Excluding sensitive fields like phone numbers)
export const listPublicAttendance = async (req: Request, res: Response) => {
  try {
    const { eventId, page = 1, limit = 20, search = '', type } = req.query;

    let targetEventId = eventId as string;

    if (!targetEventId) {
      const activeSetting = await prisma.settings.findUnique({
        where: { key: 'activeEventId' }
      });
      if (activeSetting) {
        targetEventId = activeSetting.value;
      } else {
        const fallbackEvent = await prisma.event.findFirst({ orderBy: { createdAt: 'desc' } });
        if (fallbackEvent) {
          targetEventId = fallbackEvent.id;
        }
      }
    }

    if (!targetEventId) {
      return res.status(200).json({
        data: [],
        pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 }
      });
    }

    const p = Number(page);
    const l = Number(limit);
    const skip = (p - 1) * l;

    const whereClause: any = {
      eventId: targetEventId
    };

    if (type === 'PESERTA' || type === 'TAMU') {
      whereClause.type = type;
    }

    if (search) {
      const searchStr = String(search);
      whereClause.OR = [
        {
          participant: {
            OR: [
              { name: { contains: searchStr, mode: 'insensitive' } },
              { nim: { contains: searchStr, mode: 'insensitive' } },
              { prodi: { contains: searchStr, mode: 'insensitive' } }
            ]
          }
        },
        {
          guest: {
            OR: [
              { name: { contains: searchStr, mode: 'insensitive' } },
              { institution: { contains: searchStr, mode: 'insensitive' } },
              { position: { contains: searchStr, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    const total = await prisma.attendance.count({ where: whereClause });
    const records = await prisma.attendance.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        checkInTime: true,
        participant: {
          select: {
            name: true,
            nim: true,
            prodi: true,
            fakultas: true
          }
        },
        guest: {
          select: {
            name: true,
            institution: true,
            position: true
          }
        }
      },
      orderBy: { checkInTime: 'desc' },
      skip,
      take: l
    });

    res.status(200).json({
      data: records,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      }
    });

  } catch (error: any) {
    console.error('Error in listPublicAttendance:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data presensi publik', error: error.message });
  }
};
