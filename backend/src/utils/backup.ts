import prisma from '../config/db';

export const exportDatabaseBackup = async () => {
  const users = await prisma.user.findMany();
  const events = await prisma.event.findMany();
  const participants = await prisma.participant.findMany();
  const guests = await prisma.guest.findMany();
  const attendances = await prisma.attendance.findMany();
  const settings = await prisma.settings.findMany();

  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      users,
      events,
      participants,
      guests,
      attendances,
      settings
    }
  };
};

export const importDatabaseBackup = async (backupJson: any) => {
  if (!backupJson || !backupJson.data) {
    throw new Error('Format file backup tidak valid.');
  }

  const { users, events, participants, guests, attendances, settings } = backupJson.data;

  // Perform inside a transaction
  return await prisma.$transaction(async (tx) => {
    // Clear existing data safely (order of deletion matters to avoid FK constraint issues)
    await tx.attendance.deleteMany();
    await tx.participant.deleteMany();
    await tx.guest.deleteMany();
    await tx.event.deleteMany();
    await tx.settings.deleteMany();
    await tx.user.deleteMany();

    // Re-insert users
    if (users && users.length > 0) {
      await tx.user.createMany({ data: users });
    }

    // Re-insert events
    if (events && events.length > 0) {
      // Map ISO string dates back to Date objects
      const formattedEvents = events.map((e: any) => ({
        ...e,
        date: new Date(e.date),
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt)
      }));
      await tx.event.createMany({ data: formattedEvents });
    }

    // Re-insert participants
    if (participants && participants.length > 0) {
      const formattedParticipants = participants.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }));
      await tx.participant.createMany({ data: formattedParticipants });
    }

    // Re-insert guests
    if (guests && guests.length > 0) {
      const formattedGuests = guests.map((g: any) => ({
        ...g,
        createdAt: new Date(g.createdAt),
        updatedAt: new Date(g.updatedAt)
      }));
      await tx.guest.createMany({ data: formattedGuests });
    }

    // Re-insert attendances
    if (attendances && attendances.length > 0) {
      const formattedAttendances = attendances.map((a: any) => ({
        ...a,
        checkInTime: new Date(a.checkInTime),
        createdAt: new Date(a.createdAt)
      }));
      await tx.attendance.createMany({ data: formattedAttendances });
    }

    // Re-insert settings
    if (settings && settings.length > 0) {
      await tx.settings.createMany({ data: settings });
    }

    return { success: true, counts: {
      users: users?.length || 0,
      events: events?.length || 0,
      participants: participants?.length || 0,
      guests: guests?.length || 0,
      attendances: attendances?.length || 0,
      settings: settings?.length || 0
    }};
  });
};
