import { Prisma } from '@prisma/client';

export const tenantIsolationExtension = (tenantId: string) => {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const anyArgs = args as any;

          // Automatically inject tenantId into all operations
          if (operation === 'findMany' || operation === 'findFirst' || operation === 'findUnique') {
            anyArgs.where = { ...anyArgs.where, tenantId };
          }
          
          if (operation === 'create') {
            anyArgs.data = { ...anyArgs.data, tenantId };
          }

          if (operation === 'update' || operation === 'delete') {
            anyArgs.where = { ...anyArgs.where, tenantId };
          }

          return query(anyArgs);
        },
      },
    },
  });
};
