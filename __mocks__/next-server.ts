export const NextResponse = {
  json: (body: any, init?: any) => ({
    status: init?.status || 200,
    json: async () => body,
  })
};
