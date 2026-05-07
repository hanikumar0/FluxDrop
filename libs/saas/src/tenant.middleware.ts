import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Resolve tenant from header or subdomain
    const tenantId = req.headers['x-tenant-id'] || this.resolveFromHost(req.hostname);

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }

    // Attach to request for downstream usage
    (req as any).tenantId = tenantId;
    next();
  }

  private resolveFromHost(host: string): string | null {
    const parts = host.split('.');
    if (parts.length >= 3) {
      return parts[0]; // subdomain
    }
    return null;
  }
}
