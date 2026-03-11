import prisma from '../config/prisma.js';

export const emptyApplicationStats = {
  appliedCount: 0,
  acceptedCount: 0,
  pendingCount: 0,
  rejectedCount: 0
};

export const getApplicationStatsMapForJobs = async (jobIds) => {
  const uniqueIds = Array.from(new Set((Array.isArray(jobIds) ? jobIds : []).filter(Boolean)));
  const statsMap = new Map();

  if (!uniqueIds.length) return statsMap;

  const rows = await prisma.jobApplication.findMany({
    where: {
      jobId: { in: uniqueIds }
    },
    select: {
      jobId: true,
      status: true
    }
  });

  rows.forEach((row) => {
    const current = statsMap.get(row.jobId) || { ...emptyApplicationStats };
    current.appliedCount += 1;
    const status = String(row.status || '').toUpperCase();
    if (status === 'ACCEPTED') current.acceptedCount += 1;
    else if (status === 'PENDING') current.pendingCount += 1;
    else if (status === 'REJECTED') current.rejectedCount += 1;
    statsMap.set(row.jobId, current);
  });

  return statsMap;
};
