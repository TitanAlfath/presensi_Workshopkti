import { Request, Response } from 'express';
import prisma from '../config/db';

// Get active event
export const getActiveEvent = async (req: Request, res: Response) => {
  try {
    // Look up active event ID from settings
    const activeSetting = await prisma.settings.findUnique({
      where: { key: 'activeEventId' }
    });

    let activeEvent = null;

    if (activeSetting && activeSetting.value) {
      activeEvent = await prisma.event.findUnique({
        where: { id: activeSetting.value }
      });
    }

    // Fallback: if no active event is configured, get the latest created event
    if (!activeEvent) {
      activeEvent = await prisma.event.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      // If we found an event, make it active in settings for future requests
      if (activeEvent) {
        await prisma.settings.upsert({
          where: { key: 'activeEventId' },
          update: { value: activeEvent.id },
          create: { key: 'activeEventId', value: activeEvent.id }
        });
      }
    }

    if (!activeEvent) {
      return res.status(200).json(null);
    }

    res.status(200).json(activeEvent);
  } catch (error: any) {
    console.error('Error in getActiveEvent:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil event aktif', error: error.message });
  }
};

// Create a new event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const { name, location, date, description } = req.body;

    if (!name || !location || !date || !description) {
      return res.status(400).json({ message: 'Nama, lokasi, tanggal, dan deskripsi event harus diisi!' });
    }

    // Files uploaded by Multer
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let logoPath = '';
    let bannerPath = '';

    if (files) {
      if (files['logo'] && files['logo'][0]) {
        logoPath = `/uploads/${files['logo'][0].filename}`;
      }
      if (files['banner'] && files['banner'][0]) {
        bannerPath = `/uploads/${files['banner'][0].filename}`;
      }
    }

    const newEvent = await prisma.event.create({
      data: {
        name,
        location,
        date: new Date(date),
        description,
        logo: logoPath || null,
        banner: bannerPath || null
      }
    });

    // Make this the active event automatically if none is set
    const activeSetting = await prisma.settings.findUnique({
      where: { key: 'activeEventId' }
    });

    if (!activeSetting) {
      await prisma.settings.upsert({
        where: { key: 'activeEventId' },
        update: { value: newEvent.id },
        create: { key: 'activeEventId', value: newEvent.id }
      });
    }

    res.status(201).json({ message: 'Event berhasil dibuat', event: newEvent });
  } catch (error: any) {
    console.error('Error in createEvent:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat membuat event', error: error.message });
  }
};

// Update event details
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, location, date, description } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    // Handle files uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const updateData: any = {
      name: name || event.name,
      location: location || event.location,
      date: date ? new Date(date) : event.date,
      description: description || event.description
    };

    if (files) {
      if (files['logo'] && files['logo'][0]) {
        updateData.logo = `/uploads/${files['logo'][0].filename}`;
      }
      if (files['banner'] && files['banner'][0]) {
        updateData.banner = `/uploads/${files['banner'][0].filename}`;
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({ message: 'Event berhasil diperbarui', event: updatedEvent });
  } catch (error: any) {
    console.error('Error in updateEvent:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui event', error: error.message });
  }
};

// List all events
export const listEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'desc' }
    });
    res.status(200).json(events);
  } catch (error: any) {
    console.error('Error in listEvents:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil daftar event', error: error.message });
  }
};

// Set active event in settings
export const setActiveEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Event ID harus diisi!' });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    const updatedSetting = await prisma.settings.upsert({
      where: { key: 'activeEventId' },
      update: { value: id },
      create: { key: 'activeEventId', value: id }
    });

    res.status(200).json({ message: 'Event aktif berhasil diubah', setting: updatedSetting, event });
  } catch (error: any) {
    console.error('Error in setActiveEvent:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengubah event aktif', error: error.message });
  }
};
