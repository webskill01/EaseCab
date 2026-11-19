-- Group links: "Request sent" (admin tapped Join) and "Later" (parked) tabs.
ALTER TYPE "WaInviteStatus" ADD VALUE 'requested';
ALTER TYPE "WaInviteStatus" ADD VALUE 'later';
