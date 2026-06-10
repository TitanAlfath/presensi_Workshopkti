import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { notifyNewAttendance } from '../utils/socket';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

// List all participants (or guests), optionally paginated and filtered by search
export const listParticipants = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', eventId, type = 'PESERTA' } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required to determine attendance status' });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    if (type === 'TAMU') {
      const whereClause: any = search ? {
        OR: [
          { name: { contains: String(search) } },
          { institution: { contains: String(search) } },
        ]
      } : {};

      const combinedWhereClause = {
        ...whereClause,
        attendances: {
          none: { eventId: String(eventId) }
        }
      };

      const total = await prisma.guest.count({ where: combinedWhereClause });
      
      const guests = await prisma.guest.findMany({
        where: combinedWhereClause,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        include: {
          attendances: {
            where: { eventId: String(eventId) },
            select: { id: true, checkInTime: true }
          }
        }
      });

      const formattedGuests = guests.map(g => {
        const isAttended = g.attendances && g.attendances.length > 0;
        return {
          ...g,
          type: 'TAMU',
          nim: g.institution, // map to same property for frontend
          prodi: g.position,
          fakultas: '-',
          isAttended,
          checkInTime: isAttended ? g.attendances[0].checkInTime : null,
          attendances: undefined
        };
      });

      return res.status(200).json({
        data: formattedGuests,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    }

    // PESERTA
    const whereClause: any = search ? {
      OR: [
        { name: { contains: String(search) } },
        { nim: { contains: String(search) } },
      ]
    } : {};

    const combinedWhereClause = {
      ...whereClause,
      attendances: {
        none: { eventId: String(eventId) }
      }
    };

    const total = await prisma.participant.count({ where: combinedWhereClause });
    
    const participants = await prisma.participant.findMany({
      where: combinedWhereClause,
      skip,
      take: limitNum,
      orderBy: { name: 'asc' },
      include: {
        attendances: {
          where: { eventId: String(eventId) },
          select: { id: true, checkInTime: true }
        }
      }
    });

    const formattedParticipants = participants.map(p => {
      const isAttended = p.attendances && p.attendances.length > 0;
      return {
        ...p,
        type: 'PESERTA',
        isAttended,
        checkInTime: isAttended ? p.attendances[0].checkInTime : null,
        attendances: undefined // remove the array
      };
    });

    res.status(200).json({
      data: formattedParticipants,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error in listParticipants:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data peserta', error: error.message });
  }
};

// Admin manually forces check-in for a participant or guest
export const forceCheckInParticipant = async (req: Request, res: Response) => {
  try {
    const { participantId, eventId, email, phone, type = 'PESERTA' } = req.body;

    if (!participantId || !eventId) {
      return res.status(400).json({ message: 'participantId dan eventId wajib diisi!' });
    }

    if (type === 'TAMU') {
      const guest = await prisma.guest.findUnique({ where: { id: participantId } });
      if (!guest) return res.status(404).json({ message: 'Tamu tidak ditemukan' });

      const existingAttendance = await prisma.attendance.findFirst({
        where: { eventId, type: 'TAMU', guestId: participantId }
      });
      if (existingAttendance) return res.status(400).json({ message: 'Tamu ini sudah melakukan presensi' });

      if (phone) {
        await prisma.guest.update({
          where: { id: participantId },
          data: { phone }
        });
      }

      const attendance = await prisma.attendance.create({
        data: {
          eventId,
          type: 'TAMU',
          guestId: participantId
        },
        include: { guest: true, event: true }
      });

      notifyNewAttendance(attendance);
      return res.status(201).json({ message: 'Tamu berhasil diabsenkan secara manual', attendance });
    }

    // PESERTA logic
    const participant = await prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) {
      return res.status(404).json({ message: 'Peserta tidak ditemukan' });
    }

    const existingAttendance = await prisma.attendance.findFirst({
      where: { eventId, type: 'PESERTA', participantId }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Peserta ini sudah melakukan presensi' });
    }

    // Update phone/email if provided
    if (email || phone) {
      await prisma.participant.update({
        where: { id: participantId },
        data: {
          email: email || participant.email,
          phone: phone || participant.phone
        }
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        eventId,
        type: 'PESERTA',
        participantId
      },
      include: {
        participant: true,
        event: true
      }
    });

    // Broadcast
    notifyNewAttendance(attendance);

    res.status(201).json({ message: 'Peserta berhasil diabsenkan secara manual', attendance });
  } catch (error: any) {
    console.error('Error in forceCheckInParticipant:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mencatat presensi', error: error.message });
  }
};

export const exportParticipants = async (req: Request, res: Response) => {
  try {
    const { eventId, type = 'PESERTA' } = req.query;
    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required to determine attendance status' });
    }

    const event = await prisma.event.findUnique({ where: { id: String(eventId) } });
    const eventName = event?.name || 'Event';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Presifiy';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(type === 'TAMU' ? 'Data Tamu' : 'Data Peserta');

    // Headers
    worksheet.mergeCells('A1', 'H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `REKAPITULASI DATA ${type === 'TAMU' ? 'TAMU UNDANGAN' : 'PESERTA'} - ${eventName.toUpperCase()}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };

    worksheet.addRow([]);

    let headers = [];
    if (type === 'TAMU') {
      headers = ['No', 'Nama Lengkap', 'Instansi', 'Jabatan', 'Nomor HP', 'Status Presensi', 'Waktu Presensi'];
    } else {
      headers = ['No', 'Nama Lengkap', 'NIM', 'Program Studi', 'Fakultas', 'Nomor HP', 'Email', 'Status Presensi', 'Waktu Presensi'];
    }

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '374151' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    if (type === 'TAMU') {
      const guests = await prisma.guest.findMany({
        orderBy: { name: 'asc' },
        include: {
          attendances: {
            where: { eventId: String(eventId) },
            select: { id: true, checkInTime: true }
          }
        }
      });
      guests.forEach((g, index) => {
        const isAttended = g.attendances && g.attendances.length > 0;
        const checkInStr = isAttended ? new Date(g.attendances[0].checkInTime).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'medium',
          timeStyle: 'medium'
        }) : '-';
        const statusStr = isAttended ? 'Hadir' : 'Belum Hadir';

        const row = worksheet.addRow([
          index + 1, g.name, g.institution, g.position, g.phone, statusStr, checkInStr
        ]);
        row.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
      });
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 30;
      worksheet.getColumn(3).width = 25;
      worksheet.getColumn(4).width = 20;
      worksheet.getColumn(5).width = 20;
      worksheet.getColumn(6).width = 15;
      worksheet.getColumn(7).width = 25;
    } else {
      const participants = await prisma.participant.findMany({
        orderBy: { name: 'asc' },
        include: {
          attendances: {
            where: { eventId: String(eventId) },
            select: { id: true, checkInTime: true }
          }
        }
      });
      participants.forEach((p, index) => {
        const isAttended = p.attendances && p.attendances.length > 0;
        const checkInStr = isAttended ? new Date(p.attendances[0].checkInTime).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'medium',
          timeStyle: 'medium'
        }) : '-';
        const statusStr = isAttended ? 'Hadir' : 'Belum Hadir';

        const row = worksheet.addRow([
          index + 1, p.name, p.nim, p.prodi, p.fakultas, p.phone, p.email || '-', statusStr, checkInStr
        ]);
        row.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
      });
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 30;
      worksheet.getColumn(3).width = 20;
      worksheet.getColumn(4).width = 25;
      worksheet.getColumn(5).width = 15;
      worksheet.getColumn(6).width = 20;
      worksheet.getColumn(7).width = 25;
      worksheet.getColumn(8).width = 15;
      worksheet.getColumn(9).width = 25;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Data_${type}_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error: any) {
    console.error('Error exporting participants:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat ekspor', error: error.message });
  }
};

export const deleteMultipleParticipants = async (req: Request, res: Response) => {
  try {
    const { ids, type } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'List id wajib diberikan' });
    }

    if (type === 'TAMU') {
      await prisma.guest.deleteMany({ where: { id: { in: ids } } });
    } else {
      await prisma.participant.deleteMany({ where: { id: { in: ids } } });
    }

    res.status(200).json({ message: `${ids.length} data berhasil dihapus` });
  } catch (error: any) {
    console.error('Error in deleteMultipleParticipants:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus data', error: error.message });
  }
};

export const clearAllParticipants = async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    
    if (type === 'TAMU') {
      await prisma.guest.deleteMany();
    } else {
      await prisma.participant.deleteMany();
    }

    res.status(200).json({ message: `Semua data ${type === 'TAMU' ? 'tamu' : 'peserta'} berhasil dikosongkan` });
  } catch (error: any) {
    console.error('Error in clearAllParticipants:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengosongkan data', error: error.message });
  }
};
