export const queryKeys = {
  providers: {
    search: (zip: string, service?: string) => ['providers', 'search', zip, service] as const,
    detail: (id: string) => ['providers', id] as const,
    jobs: (providerId: string) => ['providers', providerId, 'jobs'] as const,
    earnings: (providerId: string) => ['providers', providerId, 'earnings'] as const,
    schedule: (providerId: string, week: string) =>
      ['providers', providerId, 'schedule', week] as const,
  },
  bookings: {
    all: (userId: string) => ['bookings', userId] as const,
    detail: (id: string) => ['bookings', id] as const,
    match: (params: object) => ['bookings', 'match', params] as const,
  },
  jobs: {
    detail: (id: string) => ['jobs', id] as const,
  },
  claims: {
    all: (userId: string) => ['claims', userId] as const,
  },
  catalog: {
    priceFloors: () => ['price-floors'] as const,
  },
} as const;
